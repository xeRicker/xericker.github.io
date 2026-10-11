let activeFloatingControl = null;

export function closeAllControls(except = null) {
    document.querySelectorAll('.custom-control.is-open, .preset-btn-wrapper.is-open').forEach(control => {
        if (control === except) return;
        control.classList.remove('is-open');
        setControlExpanded(control, false);
        const popover = control._floatingPopover || control.querySelector('.custom-control__popover');
        if (popover) resetPopoverPosition(popover);
    });
    if (!except) {
        activeFloatingControl = null;
    }
}

export function toggleControl(wrapper, popover) {
    const willOpen = !wrapper.classList.contains('is-open');
    closeAllControls(wrapper);
    wrapper.classList.toggle('is-open', willOpen);
    setControlExpanded(wrapper, willOpen);
    if (willOpen && popover) {
        mountPopover(wrapper, popover);
        activeFloatingControl = { wrapper, popover };
        requestAnimationFrame(() => positionPopover(wrapper, popover));
    } else if (popover) {
        resetPopoverPosition(popover);
        activeFloatingControl = null;
    }
}

function mountPopover(wrapper, popover) {
    popover._returnParent = popover.parentElement;
    popover._returnNextSibling = popover.nextSibling;
    wrapper._floatingPopover = popover;
    document.body.appendChild(popover);
    popover.classList.add('is-open');
    if (!popover._floatingListenersBound) {
        popover.addEventListener('click', stopScrollPropagation);
        popover.addEventListener('pointerdown', stopScrollPropagation);
        popover.addEventListener('wheel', stopScrollPropagation, { passive: true });
        popover.addEventListener('touchmove', stopScrollPropagation, { passive: true });
        popover._floatingListenersBound = true;
    }
}

function positionPopover(wrapper, popover) {
    const button = wrapper.querySelector('.custom-control__button, .btn-preset');
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportGap = 10;
    const desiredWidth = getPopoverWidth(rect, popover, viewportGap);
    const left = Math.min(Math.max(rect.left, viewportGap), window.innerWidth - desiredWidth - viewportGap);
    const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
    const spaceAbove = rect.top - viewportGap;
    const preferredHeight = getPreferredPopoverHeight(wrapper, popover);

    const openUp = spaceBelow < preferredHeight + 8 && spaceAbove > spaceBelow;
    const available = (openUp ? spaceAbove : spaceBelow) - 8;
    const maxHeight = Math.max(180, Math.min(preferredHeight, available));

    popover.classList.add('is-floating');
    popover.style.width = `${desiredWidth}px`;
    popover.style.left = `${left + window.scrollX}px`;
    popover.style.right = 'auto';
    popover.style.maxHeight = `${maxHeight}px`;

    if (openUp) {
        popover.style.top = `${rect.top + window.scrollY - popover.offsetHeight - 6}px`;
        popover.style.bottom = 'auto';
    } else {
        popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
        popover.style.bottom = 'auto';
    }
}

function getPreferredPopoverHeight(wrapper, popover) {
    if (popover.classList.contains('custom-calendar')) {
        return measureCalendarHeight(popover);
    }
    if (popover.classList.contains('custom-time__popover')) return 320;
    if (popover.classList.contains('custom-preset__popover')) return 260;
    return Math.min(popover.scrollHeight || 0, 300) || 220;
}

function measureCalendarHeight(popover) {
    const current = popover.style.maxHeight;
    popover.style.maxHeight = 'none';
    const measured = popover.offsetHeight;
    popover.style.maxHeight = current;
    return measured || 380;
}

function getPopoverWidth(rect, popover, viewportGap) {
    const maxAvailable = window.innerWidth - viewportGap * 2;
    if (popover.classList.contains('custom-time__popover')) {
        return Math.min(Math.max(rect.width, 300), maxAvailable);
    }
    if (popover.classList.contains('custom-calendar')) {
        return Math.min(Math.max(rect.width, 318), maxAvailable);
    }
    if (popover.classList.contains('custom-preset__popover')) {
        return Math.min(Math.max(rect.width, 190), maxAvailable);
    }
    return Math.min(Math.max(rect.width, Math.min(240, maxAvailable)), maxAvailable);
}

export function repositionOpenControl() {
    if (!activeFloatingControl?.wrapper?.classList.contains('is-open')) return;
    positionPopover(activeFloatingControl.wrapper, activeFloatingControl.popover);
}

function stopScrollPropagation(event) {
    event.stopPropagation();
}

function resetPopoverPosition(popover) {
    const wrapper = popover._returnParent?.closest?.('.custom-control, .preset-btn-wrapper');
    popover.classList.remove('is-floating');
    popover.classList.remove('is-open');
    ['width', 'left', 'right', 'top', 'bottom', 'maxHeight'].forEach(prop => {
        popover.style[prop] = '';
    });

    if (popover._returnParent && popover.parentElement !== popover._returnParent) {
        popover._returnParent.insertBefore(popover, popover._returnNextSibling || null);
    }

    if (wrapper?._floatingPopover === popover) {
        wrapper._floatingPopover = null;
    }

    if (activeFloatingControl?.popover === popover) {
        activeFloatingControl = null;
    }
}

function setControlExpanded(wrapper, expanded) {
    wrapper?.querySelector('.custom-control__button, .btn-preset')?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

export function getActiveFloatingControl() {
    return activeFloatingControl;
}
