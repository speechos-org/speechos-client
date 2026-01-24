/**
 * Main widget container component
 * Composes mic button and action bubbles with state management
 */

import {
  LitElement,
  html,
  css,
  type CSSResultGroup,
  type TemplateResult,
} from "lit";
import { customElement, state as litState } from "lit/decorators.js";
import { themeStyles, animations } from "./styles/theme.js";
import {
  state,
  events,
  getConfig,
  getBackend,
  type SpeechOSState,
  type UnsubscribeFn,
  type CommandResult,
  type SpeechOSEventMap,
} from "@speechos/core";
import { getClientConfig, isAlwaysVisible } from "../config.js";
import { getSessionSettings } from "../speechos.js";
import { transcriptStore } from "../stores/transcript-store.js";

// Import child components
import "./mic-button.js";
import "./action-bubbles.js";
import "./settings-button.js";
import "./settings-modal.js";
import "./dictation-output-modal.js";
import "./edit-help-modal.js";

/**
 * Minimum duration to show the connecting animation (in milliseconds).
 * Since mic capture starts almost instantly, we enforce a minimum animation
 * duration so users can see the visual feedback before transitioning to recording.
 */
const MIN_CONNECTING_ANIMATION_MS = 200;

/**
 * Time to wait for a transcription event before showing the "no audio" warning (in milliseconds).
 * If no transcription:interim event is received within this time during recording,
 * it indicates the server isn't receiving/processing audio.
 */
const NO_AUDIO_WARNING_TIMEOUT_MS = 5000;

/**
 * Number of consecutive actions with empty results before showing warning on next action.
 */
const CONSECUTIVE_NO_AUDIO_THRESHOLD = 2;

@customElement("speechos-widget")
export class SpeechOSWidget extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    animations,
    css`
      :host {
        position: fixed;
        bottom: var(--speechos-spacing-md); /* 12px - same as spacing above */
        z-index: var(--speechos-z-base);
        pointer-events: none;
      }

      :host {
        left: 50%;
        transform: translateX(-50%);
      }

      :host(.custom-position) {
        right: unset;
        left: unset;
        transform: none;
      }

      :host(.anchored-to-element) {
        position: absolute;
        bottom: unset;
        right: unset;
        left: unset;
        transform: translateX(-50%);
      }

      :host([hidden]) {
        display: none;
      }

      .widget-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: auto;
        animation: speechos-fadeIn var(--speechos-transition-base);
        cursor: grab;
        position: relative;
      }

      .widget-container:active {
        cursor: grabbing;
      }

      .widget-container.hiding {
        animation: speechos-fadeOut var(--speechos-transition-base);
      }

      .mic-row {
        position: relative;
        display: flex;
        align-items: center;
      }

      .settings-button-container {
        position: absolute;
        left: -44px;
        top: 50%;
        transform: translateY(-50%);
      }

      /* Mobile styles - adjust positioning for larger elements */
      @media (max-width: 768px) and (hover: none) {
        .settings-button-container {
          left: -56px;
        }
      }
    `,
  ];

  @litState()
  private widgetState: SpeechOSState = state.getState();

  @litState()
  private settingsOpen = false;

  private settingsOpenFromWarning = false;

  @litState()
  private dictationModalOpen = false;

  @litState()
  private dictationModalText = "";

  @litState()
  private editHelpModalOpen = false;

  @litState()
  private actionFeedback: "command-success" | "command-none" | "edit-empty" | null = null;

  @litState()
  private showNoAudioWarning = false;

  @litState()
  private isErrorRetryable = true;

  private stateUnsubscribe?: UnsubscribeFn;
  private errorEventUnsubscribe?: UnsubscribeFn;
  private dictationTargetElement: HTMLElement | null = null;
  private editTargetElement: HTMLElement | null = null;
  private dictationCursorStart: number | null = null;
  private dictationCursorEnd: number | null = null;
  private editSelectionStart: number | null = null;
  private editSelectionEnd: number | null = null;
  private editSelectedText: string = "";
  private boundClickOutsideHandler: ((event: MouseEvent) => void) | null = null;
  private modalElement: HTMLElement | null = null;
  private dictationModalElement: HTMLElement | null = null;
  private editHelpModalElement: HTMLElement | null = null;
  private actionFeedbackTimeout: number | null = null;
  private customPosition: { x: number; y: number } | null = null;
  private isDragging = false;
  private dragStartPos: { x: number; y: number } | null = null;
  private dragOffset = { x: 0, y: 0 };
  private boundDragMove: ((e: MouseEvent) => void) | null = null;
  private boundDragEnd: (() => void) | null = null;
  private static readonly DRAG_THRESHOLD = 5;
  private suppressNextClick = false;
  private boundViewportResizeHandler: (() => void) | null = null;
  private boundScrollHandler: (() => void) | null = null;
  private static readonly KEYBOARD_HEIGHT_THRESHOLD = 150;

  // No-audio warning state tracking
  private consecutiveNoAudioActions = 0;
  private transcriptionReceived = false;
  private noAudioWarningTimeout: number | null = null;
  private transcriptionInterimUnsubscribe: UnsubscribeFn | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.modalElement = document.createElement("speechos-settings-modal");
    this.modalElement.addEventListener("modal-close", () => {
      this.settingsOpen = false;
      this.settingsOpenFromWarning = false;
    });
    document.body.appendChild(this.modalElement);

    // Mount dictation output modal
    this.dictationModalElement = document.createElement(
      "speechos-dictation-output-modal"
    );
    this.dictationModalElement.addEventListener("modal-close", () => {
      this.dictationModalOpen = false;
    });
    document.body.appendChild(this.dictationModalElement);

    // Mount edit help modal
    this.editHelpModalElement = document.createElement(
      "speechos-edit-help-modal"
    );
    this.editHelpModalElement.addEventListener("modal-close", () => {
      this.editHelpModalOpen = false;
    });
    document.body.appendChild(this.editHelpModalElement);

    this.stateUnsubscribe = state.subscribe((newState: SpeechOSState) => {
      if (!newState.isVisible) {
        if (getConfig().debug && this.settingsOpen) {
          console.log("[SpeechOS] Closing settings modal: widget hidden");
        }
        this.settingsOpen = false;
        this.settingsOpenFromWarning = false;
      } else if (!newState.isExpanded && !this.settingsOpenFromWarning) {
        if (getConfig().debug && this.settingsOpen) {
          console.log("[SpeechOS] Closing settings modal: widget collapsed");
        }
        this.settingsOpen = false;
      }
      // Clear custom position when focused element changes (re-anchor to new element)
      if (newState.focusedElement !== this.widgetState.focusedElement) {
        this.customPosition = null;
        this.classList.remove("custom-position");
      }
      this.widgetState = newState;
      this.updatePosition();
    });

    this.errorEventUnsubscribe = events.on("error", (payload: SpeechOSEventMap["error"]) => {
      if (
        this.widgetState.recordingState !== "idle" &&
        this.widgetState.recordingState !== "error"
      ) {
        // Check if this is a non-retryable error (e.g., CSP blocked connection)
        this.isErrorRetryable = payload.code !== "connection_blocked";
        state.setError(payload.message);
        getBackend().disconnect().catch(() => {});
      }
    });

    this.updatePosition();
    this.boundClickOutsideHandler = this.handleClickOutside.bind(this);
    document.addEventListener("click", this.boundClickOutsideHandler, true);

    // Setup visual viewport listener for mobile keyboard handling
    if (window.visualViewport) {
      this.boundViewportResizeHandler = this.handleViewportResize.bind(this);
      window.visualViewport.addEventListener(
        "resize",
        this.boundViewportResizeHandler
      );
    }

    // Setup scroll listener to update anchored position
    this.boundScrollHandler = this.handleScroll.bind(this);
    window.addEventListener("scroll", this.boundScrollHandler, {
      passive: true,
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    if (this.dictationModalElement) {
      this.dictationModalElement.remove();
      this.dictationModalElement = null;
    }
    if (this.editHelpModalElement) {
      this.editHelpModalElement.remove();
      this.editHelpModalElement = null;
    }
    if (this.actionFeedbackTimeout) {
      clearTimeout(this.actionFeedbackTimeout);
      this.actionFeedbackTimeout = null;
    }
    if (this.stateUnsubscribe) {
      this.stateUnsubscribe();
    }
    if (this.errorEventUnsubscribe) {
      this.errorEventUnsubscribe();
    }
    if (this.boundClickOutsideHandler) {
      document.removeEventListener(
        "click",
        this.boundClickOutsideHandler,
        true
      );
      this.boundClickOutsideHandler = null;
    }
    if (this.boundDragMove) {
      document.removeEventListener("mousemove", this.boundDragMove);
      this.boundDragMove = null;
    }
    if (this.boundDragEnd) {
      document.removeEventListener("mouseup", this.boundDragEnd);
      this.boundDragEnd = null;
    }
    if (this.boundViewportResizeHandler && window.visualViewport) {
      window.visualViewport.removeEventListener(
        "resize",
        this.boundViewportResizeHandler
      );
      this.boundViewportResizeHandler = null;
    }
    if (this.boundScrollHandler) {
      window.removeEventListener("scroll", this.boundScrollHandler);
      this.boundScrollHandler = null;
    }
    this.cleanupNoAudioWarningTracking();
  }

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("settingsOpen") && this.modalElement) {
      (this.modalElement as any).open = this.settingsOpen;
    }
    if (changedProperties.has("dictationModalOpen") && this.dictationModalElement) {
      (this.dictationModalElement as any).open = this.dictationModalOpen;
    }
    if (changedProperties.has("dictationModalText") && this.dictationModalElement) {
      (this.dictationModalElement as any).text = this.dictationModalText;
    }
    if (changedProperties.has("editHelpModalOpen") && this.editHelpModalElement) {
      (this.editHelpModalElement as any).open = this.editHelpModalOpen;
    }
  }

  private handleClickOutside(event: MouseEvent): void {
    const target = event.target as Node;

    // Check if clicked element or ancestor has no-close attribute (before any other checks)
    const hasNoCloseAttr =
      target instanceof Element && target.closest("[data-speechos-no-close]");
    console.log("[SpeechOS] handleClickOutside called", {
      isExpanded: this.widgetState.isExpanded,
      recordingState: this.widgetState.recordingState,
      target: event.target,
      hasNoCloseAttr: !!hasNoCloseAttr,
    });
    if (hasNoCloseAttr) {
      console.log("[SpeechOS] Skipping due to data-speechos-no-close");
      return;
    }

    if (
      !this.widgetState.isExpanded ||
      this.widgetState.recordingState !== "idle"
    ) {
      console.log("[SpeechOS] Early return - not expanded or not idle");
      return;
    }

    const composedPath = event.composedPath ? event.composedPath() : [];
    const clickedInWidget =
      this.contains(target) || composedPath.includes(this);
    const clickedInModal =
      this.modalElement &&
      (this.modalElement.contains(target) ||
        composedPath.includes(this.modalElement));
    if (this.settingsOpen && clickedInModal) {
      return;
    }
    if (this.settingsOpen && !clickedInModal) {
      this.settingsOpen = false;
      return;
    }
    if (!clickedInWidget && this.isFormField(target as Element)) {
      state.setFocusedElement(target as HTMLElement);
      return;
    }
    if (!clickedInWidget) {
      getBackend().stopAutoRefresh?.();
      // Don't hide if alwaysVisible is enabled
      if (!isAlwaysVisible()) {
        state.hide();
      }
    }
  }

  private isFormField(element: Element | null): element is HTMLElement {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }
    const tagName = element.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") {
      if (tagName === "input") {
        const type = (element as HTMLInputElement).type.toLowerCase();
        const excludedTypes = [
          "checkbox",
          "radio",
          "submit",
          "button",
          "reset",
          "file",
          "hidden",
        ];
        if (excludedTypes.includes(type)) {
          return false;
        }
      }
      return true;
    }
    if (
      element.isContentEditable ||
      element.getAttribute("contenteditable") === "true"
    ) {
      return true;
    }
    return false;
  }

  /**
   * Check if the device is likely a mobile/touch device
   */
  private isMobileDevice(): boolean {
    // Check for touch support and small screen width
    const hasTouchScreen =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouchScreen && isSmallScreen;
  }

  private updatePosition(): void {
    const clientConfig = getClientConfig();
    this.style.zIndex = String(clientConfig.zIndex);

    // If user has dragged the widget, keep custom position
    if (this.customPosition) {
      return;
    }

    const focusedElement = this.widgetState.focusedElement;

    // Only anchor to element on mobile devices
    if (focusedElement && this.isMobileDevice()) {
      // Position below the focused element on mobile
      this.positionBelowElement(focusedElement);
    } else {
      // Default fixed position at bottom of screen (desktop or no focused element)
      this.classList.remove("anchored-to-element");
      this.style.top = "";
      this.style.left = "";
      this.style.bottom = "12px";
    }
  }

  /**
   * Position the widget below a specific element
   */
  private positionBelowElement(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const widgetHeight = 60; // Approximate widget height
    const gap = 8; // Gap between element and widget

    // Calculate position
    const top = rect.bottom + gap + window.scrollY;
    const left = rect.left + rect.width / 2 + window.scrollX;

    // Apply anchored positioning
    this.classList.add("anchored-to-element");
    this.removeAttribute("position");
    this.style.top = `${top}px`;
    this.style.left = `${left}px`;
    this.style.bottom = "";
  }

  /**
   * Handle visual viewport resize (mobile keyboard show/hide)
   * Adjusts widget position to stay above the virtual keyboard
   */
  private handleViewportResize(): void {
    if (!window.visualViewport) return;

    // Skip if custom position is set (user dragged the widget)
    if (this.customPosition) return;

    // If anchored to an element on mobile, just update position
    if (this.widgetState.focusedElement && this.isMobileDevice()) {
      this.updatePosition();
      return;
    }

    const keyboardHeight = window.innerHeight - window.visualViewport.height;

    if (keyboardHeight > SpeechOSWidget.KEYBOARD_HEIGHT_THRESHOLD) {
      // Keyboard is visible - move widget above it
      this.style.bottom = `${keyboardHeight + 12}px`;
    } else {
      // Keyboard hidden - restore default position
      this.style.bottom = "12px";
    }
  }

  /**
   * Handle scroll events to update anchored position
   */
  private handleScroll(): void {
    // Skip if custom position is set, not anchored, or not on mobile
    if (
      this.customPosition ||
      !this.widgetState.focusedElement ||
      !this.isMobileDevice()
    ) {
      return;
    }

    this.positionBelowElement(this.widgetState.focusedElement);
  }

  private handleMicClick(): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    if (this.widgetState.recordingState === "idle") {
      // Clear command feedback on any mic click
      this.clearActionFeedback();

      // If we're expanding, prefetch the token to reduce latency when user selects an action
      if (!this.widgetState.isExpanded) {
        // Fire and forget - we don't need to wait for this (LiveKit only)
        const backend = getBackend();
        backend.prefetchToken?.()?.catch((error: unknown) => {
          // Log but don't show error to user - they haven't started an action yet
          const config = getConfig();
          if (config.debug) {
            console.warn("[SpeechOS] Token prefetch failed:", error);
          }
        });
      } else {
        // Widget is collapsing - stop auto-refresh since user is done with commands
        getBackend().stopAutoRefresh?.();
      }
      state.toggleExpanded();
    }
  }

  private async handleStopRecording(): Promise<void> {
    // Clean up no-audio warning tracking
    this.cleanupNoAudioWarningTracking();

    if (this.widgetState.activeAction === "edit") {
      await this.handleStopEdit();
    } else if (this.widgetState.activeAction === "command") {
      await this.handleStopCommand();
    } else {
      state.stopRecording();
      const backend = getBackend();
      try {
        const transcription: string = await this.withMinDisplayTime(
          backend.stopVoiceSession(),
          300
        );
        // Track result for consecutive failure detection
        this.trackActionResult(!!transcription);

        if (transcription) {
          // Check if we have a target element to insert into
          if (this.dictationTargetElement) {
            this.insertTranscription(transcription);
          } else {
            // No target element - show dictation output modal
            this.dictationModalText = transcription;
            this.dictationModalOpen = true;
          }
          transcriptStore.saveTranscript(transcription, "dictate");
        }
        state.completeRecording();
        events.emit("action:select", { action: "dictate" });
        backend.disconnect().catch(() => {});
        // Start auto-refresh to keep token fresh for subsequent commands (LiveKit only)
        backend.startAutoRefresh?.();
      } catch (error) {
        // Track as failed result
        this.trackActionResult(false);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to transcribe audio";
        if (errorMessage !== "Disconnected") {
          state.setError(errorMessage);
          backend.disconnect().catch(() => {});
        }
      }
    }
  }

  private async handleCancelOperation(): Promise<void> {
    // Clean up no-audio warning tracking
    this.cleanupNoAudioWarningTracking();

    await getBackend().disconnect();
    if (this.widgetState.recordingState === "error") {
      state.clearError();
    } else {
      state.cancelRecording();
    }
    this.dictationTargetElement = null;
    this.editTargetElement = null;
    this.dictationCursorStart = null;
    this.dictationCursorEnd = null;
    this.editSelectionStart = null;
    this.editSelectionEnd = null;
    this.editSelectedText = "";
  }

  private async handleRetryConnection(): Promise<void> {
    const action = this.widgetState.activeAction;
    state.clearError();
    if (action === "edit") {
      await this.startEdit();
    } else if (action === "command") {
      await this.startCommand();
    } else {
      await this.startDictation();
    }
  }

  private handleCloseWidget(): void {
    this.clearActionFeedback();
    getBackend().stopAutoRefresh?.();
    state.hide();
  }

  private handleSettingsClick(): void {
    this.settingsOpen = true;
  }

  private handleDragStart(e: MouseEvent): void {
    if (e.button !== 0) return;
    const composedPath = e.composedPath();
    const isInteractiveElement = composedPath.some((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const tagName = el.tagName.toLowerCase();
      if (
        tagName === "speechos-action-bubbles" ||
        tagName === "speechos-settings-button"
      ) {
        return true;
      }
      if (tagName === "button") {
        const className = el.className || "";
        if (!className.includes("mic-button")) {
          return true;
        }
      }
      return false;
    });
    if (isInteractiveElement) return;
    this.dragStartPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
    const rect = this.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left - rect.width / 2,
      y: rect.bottom - e.clientY,
    };
    this.boundDragMove = this.handleDragMove.bind(this);
    this.boundDragEnd = this.handleDragEnd.bind(this);
    document.addEventListener("mousemove", this.boundDragMove);
    document.addEventListener("mouseup", this.boundDragEnd);
  }

  private handleDragMove(e: MouseEvent): void {
    if (!this.isDragging && this.dragStartPos) {
      const dx = e.clientX - this.dragStartPos.x;
      const dy = e.clientY - this.dragStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= SpeechOSWidget.DRAG_THRESHOLD) {
        this.isDragging = true;
        e.preventDefault();
      } else {
        return;
      }
    }
    if (!this.isDragging) return;
    e.preventDefault();
    this.customPosition = {
      x: e.clientX - this.dragOffset.x,
      y: window.innerHeight - e.clientY - this.dragOffset.y,
    };
    this.applyCustomPosition();
  }

  private handleDragEnd(): void {
    if (this.isDragging) {
      this.suppressNextClick = true;
    }
    this.isDragging = false;
    this.dragStartPos = null;
    if (this.boundDragMove) {
      document.removeEventListener("mousemove", this.boundDragMove);
      this.boundDragMove = null;
    }
    if (this.boundDragEnd) {
      document.removeEventListener("mouseup", this.boundDragEnd);
      this.boundDragEnd = null;
    }
  }

  private applyCustomPosition(): void {
    if (this.customPosition) {
      this.classList.add("custom-position");
      this.style.left = `${this.customPosition.x}px`;
      this.style.bottom = `${this.customPosition.y}px`;
    }
  }

  private insertTranscription(text: string): void {
    const target = this.dictationTargetElement;
    if (!target) {
      return;
    }
    const tagName = target.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") {
      const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
      const start = this.dictationCursorStart ?? inputEl.value.length;
      const end = this.dictationCursorEnd ?? inputEl.value.length;
      const before = inputEl.value.substring(0, start);
      const after = inputEl.value.substring(end);
      inputEl.value = before + text + after;
      if (this.supportsSelection(inputEl)) {
        const newCursorPos = start + text.length;
        inputEl.setSelectionRange(newCursorPos, newCursorPos);
      }
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.focus();
      state.setFocusedElement(inputEl);
    } else if (target.isContentEditable) {
      target.focus();
      state.setFocusedElement(target);
      const textNode = document.createTextNode(text);
      target.appendChild(textNode);
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    events.emit("transcription:inserted", { text, element: target });
    this.dictationTargetElement = null;
    this.dictationCursorStart = null;
    this.dictationCursorEnd = null;
  }

  private handleActionSelect(event: CustomEvent): void {
    const { action } = event.detail;

    // Clear any existing command feedback when a new action is selected
    this.clearActionFeedback();

    state.setActiveAction(action);
    if (action === "dictate") {
      this.startDictation();
    } else if (action === "edit") {
      // Check if there's a focused element before starting edit
      if (!this.widgetState.focusedElement) {
        // No focused element - show edit help modal
        this.editHelpModalOpen = true;
        state.setActiveAction(null);
        return;
      }
      this.startEdit();
    } else if (action === "command") {
      this.startCommand();
    } else {
      setTimeout(() => {
        state.setState({ isExpanded: false, activeAction: null });
      }, 300);
    }
  }

  private async withMinDisplayTime<T>(
    operation: Promise<T>,
    minTime: number
  ): Promise<T> {
    const [result] = await Promise.all([
      operation,
      new Promise((resolve) => setTimeout(resolve, minTime)),
    ]);
    return result;
  }

  private async startDictation(): Promise<void> {
    this.dictationTargetElement = this.widgetState.focusedElement;
    this.dictationCursorStart = null;
    this.dictationCursorEnd = null;
    if (this.dictationTargetElement) {
      const tagName = this.dictationTargetElement.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea") {
        const inputEl = this.dictationTargetElement as
          | HTMLInputElement
          | HTMLTextAreaElement;
        if (this.supportsSelection(inputEl)) {
          this.dictationCursorStart = inputEl.selectionStart;
          this.dictationCursorEnd = inputEl.selectionEnd;
        } else {
          this.dictationCursorStart = inputEl.value.length;
          this.dictationCursorEnd = inputEl.value.length;
        }
      }
    }
    state.startRecording();
    const connectingStartTime = Date.now();
    const backend = getBackend();
    try {
      await backend.startVoiceSession({
        action: "dictate",
        settings: getSessionSettings(),
        onMicReady: () => {
          // Ensure minimum animation duration before transitioning to recording
          const elapsed = Date.now() - connectingStartTime;
          const remainingDelay = MIN_CONNECTING_ANIMATION_MS - elapsed;

          const startRecording = () => {
            if (state.getState().recordingState === "error") {
              return;
            }
            state.setRecordingState("recording");
            this.startNoAudioWarningTracking();
          };

          if (remainingDelay > 0) {
            setTimeout(startRecording, remainingDelay);
          } else {
            startRecording();
          }
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";
      if (errorMessage !== "Disconnected") {
        // Only set error if not already in error state (error event may have already set it)
        if (this.widgetState.recordingState !== "error") {
          state.setError(`Failed to connect: ${errorMessage}`);
        }
        await backend.disconnect();
      }
    }
  }

  private async startEdit(): Promise<void> {
    this.editTargetElement = this.widgetState.focusedElement;
    this.editSelectionStart = null;
    this.editSelectionEnd = null;
    this.editSelectedText = "";
    if (this.editTargetElement) {
      const tagName = this.editTargetElement.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea") {
        const inputEl = this.editTargetElement as
          | HTMLInputElement
          | HTMLTextAreaElement;
        if (this.supportsSelection(inputEl)) {
          this.editSelectionStart = inputEl.selectionStart;
          this.editSelectionEnd = inputEl.selectionEnd;
          const start = this.editSelectionStart ?? 0;
          const end = this.editSelectionEnd ?? 0;
          if (start !== end) {
            this.editSelectedText = inputEl.value.substring(start, end);
          }
        } else {
          this.editSelectionStart = 0;
          this.editSelectionEnd = 0;
        }
      } else if (this.editTargetElement.isContentEditable) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const selectedText = selection.toString();
          this.editSelectionStart = 0;
          this.editSelectionEnd = selectedText.length;
          this.editSelectedText = selectedText;
        }
      }
    }

    // Capture the content to edit at start time (sent with auth message)
    const inputText = this.getElementContent(this.editTargetElement);

    state.startRecording();
    const connectingStartTime = Date.now();
    const backend = getBackend();
    try {
      await backend.startVoiceSession({
        action: "edit",
        inputText: inputText,
        settings: getSessionSettings(),
        onMicReady: () => {
          // Ensure minimum animation duration before transitioning to recording
          const elapsed = Date.now() - connectingStartTime;
          const remainingDelay = MIN_CONNECTING_ANIMATION_MS - elapsed;

          const startRecording = () => {
            if (state.getState().recordingState === "error") {
              return;
            }
            state.setRecordingState("recording");
            this.startNoAudioWarningTracking();
          };

          if (remainingDelay > 0) {
            setTimeout(startRecording, remainingDelay);
          } else {
            startRecording();
          }
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";
      if (errorMessage !== "Disconnected") {
        // Only set error if not already in error state (error event may have already set it)
        if (this.widgetState.recordingState !== "error") {
          state.setError(`Failed to connect: ${errorMessage}`);
        }
        await backend.disconnect();
      }
    }
  }

  private async handleStopEdit(): Promise<void> {
    state.stopRecording();
    const originalContent = this.getElementContent(this.editTargetElement);
    const backend = getBackend();
    try {
      const editedText: string = await this.withMinDisplayTime(
        backend.requestEditText(originalContent),
        300
      );

      // Check if server returned no change (couldn't understand edit)
      const noChange = editedText.trim() === originalContent.trim();

      if (noChange) {
        this.trackActionResult(false);
        this.showActionFeedback("edit-empty");
        state.completeRecording();
        this.editTargetElement = null;
        this.editSelectionStart = null;
        this.editSelectionEnd = null;
        this.editSelectedText = "";
        backend.disconnect().catch(() => {});
        backend.startAutoRefresh?.();
        return;
      }

      // Track result - got a meaningful change
      this.trackActionResult(true);
      this.applyEdit(editedText);
      backend.disconnect().catch(() => {});
      // Start auto-refresh to keep token fresh for subsequent commands (LiveKit only)
      backend.startAutoRefresh?.();
    } catch (error) {
      // Track as failed result
      this.trackActionResult(false);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to apply edit";
      if (errorMessage !== "Disconnected") {
        state.setError(errorMessage);
        backend.disconnect().catch(() => {});
      }
    }
  }

  private async startCommand(): Promise<void> {
    state.startRecording();
    const connectingStartTime = Date.now();
    const backend = getBackend();
    const clientConfig = getClientConfig();
    const commands = clientConfig.commands;

    try {
      await backend.startVoiceSession({
        action: "command",
        commands: commands,
        settings: getSessionSettings(),
        onMicReady: () => {
          // Ensure minimum animation duration before transitioning to recording
          const elapsed = Date.now() - connectingStartTime;
          const remainingDelay = MIN_CONNECTING_ANIMATION_MS - elapsed;

          const startRecording = () => {
            if (state.getState().recordingState === "error") {
              return;
            }
            state.setRecordingState("recording");
            this.startNoAudioWarningTracking();
          };

          if (remainingDelay > 0) {
            setTimeout(startRecording, remainingDelay);
          } else {
            startRecording();
          }
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";
      if (errorMessage !== "Disconnected") {
        // Only set error if not already in error state (error event may have already set it)
        if (this.widgetState.recordingState !== "error") {
          state.setError(`Failed to connect: ${errorMessage}`);
        }
        await backend.disconnect();
      }
    }
  }

  private async handleStopCommand(): Promise<void> {
    state.stopRecording();
    const clientConfig = getClientConfig();
    const commands = clientConfig.commands;
    const backend = getBackend();

    try {
      const result: CommandResult | null = await this.withMinDisplayTime(
        backend.requestCommand(commands),
        300
      );

      // Track result - null result means no command matched (possibly no audio)
      this.trackActionResult(result !== null);

      // Get input text from the backend if available
      const inputText = (backend as { getLastInputText?: () => string | undefined }).getLastInputText?.();

      // Save to transcript store
      const displayText = result
        ? `${result.name}${Object.keys(result.arguments).length > 0 ? `: ${JSON.stringify(result.arguments)}` : ""}`
        : "No command matched";

      transcriptStore.saveTranscript(displayText, "command", {
        inputText,
        commandResult: result,
        commandConfig: commands,
      });

      // Note: command:complete event is already emitted by the backend
      // when the command_result message is received, so we don't emit here

      state.completeRecording();

      // Keep widget visible but collapsed (just mic button, no action bubbles)
      state.setState({ isExpanded: false });

      // Show command feedback
      this.showActionFeedback(result ? "command-success" : "command-none");

      backend.disconnect().catch(() => {});
      // Start auto-refresh to keep token fresh for subsequent commands (LiveKit only)
      backend.startAutoRefresh?.();
    } catch (error) {
      // Track as failed result
      this.trackActionResult(false);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process command";
      if (errorMessage !== "Disconnected") {
        state.setError(errorMessage);
        backend.disconnect().catch(() => {});
      }
    }
  }

  private showActionFeedback(feedback: "command-success" | "command-none" | "edit-empty"): void {
    this.actionFeedback = feedback;

    // Clear any existing timeout
    if (this.actionFeedbackTimeout) {
      clearTimeout(this.actionFeedbackTimeout);
    }

    // Auto-dismiss after 4 seconds
    this.actionFeedbackTimeout = window.setTimeout(() => {
      this.actionFeedback = null;
      this.actionFeedbackTimeout = null;
    }, 4000);
  }

  private clearActionFeedback(): void {
    if (this.actionFeedbackTimeout) {
      clearTimeout(this.actionFeedbackTimeout);
      this.actionFeedbackTimeout = null;
    }
    this.actionFeedback = null;
  }

  /**
   * Start tracking for no-audio warning when recording begins.
   */
  private startNoAudioWarningTracking(): void {
    this.transcriptionReceived = false;
    this.showNoAudioWarning = false;

    // If we had consecutive failures, show warning immediately
    if (this.consecutiveNoAudioActions >= CONSECUTIVE_NO_AUDIO_THRESHOLD) {
      this.showNoAudioWarning = true;
    }

    // Start timeout - if no transcription within 5s, show warning
    this.noAudioWarningTimeout = window.setTimeout(() => {
      if (
        !this.transcriptionReceived &&
        this.widgetState.recordingState === "recording"
      ) {
        this.showNoAudioWarning = true;
      }
    }, NO_AUDIO_WARNING_TIMEOUT_MS);

    // Subscribe to transcription:interim events
    this.transcriptionInterimUnsubscribe = events.on(
      "transcription:interim",
      () => {
        this.transcriptionReceived = true;
        if (this.showNoAudioWarning) {
          this.showNoAudioWarning = false;
        }
      }
    );
  }

  /**
   * Clean up no-audio warning tracking when recording stops.
   */
  private cleanupNoAudioWarningTracking(): void {
    if (this.noAudioWarningTimeout !== null) {
      clearTimeout(this.noAudioWarningTimeout);
      this.noAudioWarningTimeout = null;
    }
    if (this.transcriptionInterimUnsubscribe) {
      this.transcriptionInterimUnsubscribe();
      this.transcriptionInterimUnsubscribe = null;
    }
    this.showNoAudioWarning = false;
  }

  /**
   * Track the result of an action for consecutive failure detection.
   */
  private trackActionResult(hasContent: boolean): void {
    if (hasContent) {
      this.consecutiveNoAudioActions = 0;
    } else {
      this.consecutiveNoAudioActions++;
    }
  }

  /**
   * Handle opening settings from the no-audio warning.
   * Stops the current dictation session immediately, then opens settings.
   */
  private async handleOpenSettingsFromWarning(): Promise<void> {
    if (getConfig().debug) {
      console.log("[SpeechOS] No-audio settings link clicked");
    }

    // Clean up no-audio warning tracking first
    this.cleanupNoAudioWarningTracking();

    // Keep settings open even if widget collapses
    this.settingsOpenFromWarning = true;

    // Stop audio capture and disconnect immediately (don't wait for transcription)
    // Kick this off before opening settings so audio stops fast, but don't block UI.
    const disconnectPromise = getBackend().disconnect().catch((error) => {
      if (getConfig().debug) {
        console.log("[SpeechOS] Disconnect failed while opening settings", error);
      }
    });

    // Update UI state to idle
    state.cancelRecording();

    // Clear target elements
    this.dictationTargetElement = null;
    this.editTargetElement = null;
    this.dictationCursorStart = null;
    this.dictationCursorEnd = null;
    this.editSelectionStart = null;
    this.editSelectionEnd = null;
    this.editSelectedText = "";

    // Open settings modal
    this.settingsOpen = true;

    if (getConfig().debug) {
      console.log("[SpeechOS] Settings modal opened from no-audio warning");
    }

    await disconnectPromise;
  }

  private supportsSelection(
    element: HTMLInputElement | HTMLTextAreaElement
  ): boolean {
    if (element.tagName.toLowerCase() === "textarea") {
      return true;
    }
    const supportedTypes = ["text", "search", "url", "tel", "password"];
    return supportedTypes.includes(
      (element as HTMLInputElement).type || "text"
    );
  }

  private getElementContent(element: HTMLElement | null): string {
    if (!element) {
      return "";
    }
    const tagName = element.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
      const fullContent = inputEl.value;
      const start = this.editSelectionStart ?? 0;
      const end = this.editSelectionEnd ?? fullContent.length;
      const hasSelection = start !== end;
      if (hasSelection) {
        return fullContent.substring(start, end);
      }
      return fullContent;
    } else if (element.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return selection.toString();
      }
      return element.textContent || "";
    }
    return "";
  }

  private applyEdit(editedText: string): void {
    const target = this.editTargetElement;
    if (!target) {
      state.completeRecording();
      return;
    }
    const tagName = target.tagName.toLowerCase();
    let originalContent = "";
    if (tagName === "input" || tagName === "textarea") {
      const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
      originalContent = inputEl.value;
      inputEl.focus();
      if (this.supportsSelection(inputEl)) {
        const selectionStart = this.editSelectionStart ?? 0;
        const selectionEnd = this.editSelectionEnd ?? inputEl.value.length;
        const hasSelection = selectionStart !== selectionEnd;
        if (hasSelection) {
          inputEl.setSelectionRange(selectionStart, selectionEnd);
        } else {
          inputEl.setSelectionRange(0, inputEl.value.length);
        }
        document.execCommand("insertText", false, editedText);
      } else {
        inputEl.value = editedText;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
      state.setFocusedElement(inputEl);
    } else if (target.isContentEditable) {
      originalContent = target.textContent || "";
      target.focus();
      state.setFocusedElement(target);
      const hasSelection =
        this.editSelectionStart !== null &&
        this.editSelectionEnd !== null &&
        this.editSelectionStart !== this.editSelectionEnd;
      if (!hasSelection) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      document.execCommand("insertText", false, editedText);
    }
    transcriptStore.saveTranscript(editedText, "edit", originalContent);
    events.emit("edit:applied", {
      originalContent,
      editedContent: editedText,
      element: target,
    });
    state.completeRecording();
    this.editTargetElement = null;
    this.editSelectionStart = null;
    this.editSelectionEnd = null;
    this.editSelectedText = "";
  }

  render(): TemplateResult | string {
    if (!this.widgetState.isVisible) {
      this.setAttribute("hidden", "");
      return html``;
    }
    this.removeAttribute("hidden");
    const showBubbles =
      this.widgetState.isExpanded && this.widgetState.recordingState === "idle";
    const showSettings = this.widgetState.recordingState === "idle";
    return html`
      <div class="widget-container" @mousedown="${this.handleDragStart}">
        <speechos-action-bubbles
          ?visible="${showBubbles}"
          @action-select="${this.handleActionSelect}"
        ></speechos-action-bubbles>
        <div class="mic-row">
          <div class="settings-button-container">
            <speechos-settings-button
              ?visible="${showSettings}"
              @settings-click="${this.handleSettingsClick}"
            ></speechos-settings-button>
          </div>
          <speechos-mic-button
            ?expanded="${this.widgetState.isExpanded}"
            recordingState="${this.widgetState.recordingState}"
            activeAction="${this.widgetState.activeAction || ""}"
            editPreviewText="${this.editSelectedText}"
            errorMessage="${this.widgetState.errorMessage || ""}"
            ?showRetryButton="${this.isErrorRetryable}"
            .actionFeedback="${this.actionFeedback}"
            ?showNoAudioWarning="${this.showNoAudioWarning}"
            @mic-click="${this.handleMicClick}"
            @stop-recording="${this.handleStopRecording}"
            @cancel-operation="${this.handleCancelOperation}"
            @retry-connection="${this.handleRetryConnection}"
            @close-widget="${this.handleCloseWidget}"
            @open-settings="${this.handleOpenSettingsFromWarning}"
          ></speechos-mic-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-widget": SpeechOSWidget;
  }
}
