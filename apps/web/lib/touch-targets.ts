/** Makes the buttons, fields and selects inside a dialog or sheet 44px high on touch-sized screens. */
export const MOBILE_TOUCH_TARGETS =
  "max-md:[&_[data-slot=button]]:h-11! max-md:[&_[data-slot=input]]:h-11! max-md:[&_[data-slot=select-trigger]]:h-11!";

/** A form dialog: tall forms scroll inside it rather than past the screen. */
export const FORM_DIALOG_CLASS = `max-h-[90dvh] overflow-y-auto sm:max-w-md ${MOBILE_TOUCH_TARGETS}`;
