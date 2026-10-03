import { modalContent } from '../components/Modal';
import type { DialogFocus, Modal, Sidepanel } from './types';
import { element, query } from './dom';
export function createDialogFocus(): DialogFocus {
  return {
    active: null,
    opener: null,
    open(el, opener) {
      if (this.active) this.close(this.active);
      this.opener =
        opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      this.active = el;
      el.hidden = false;
      el.classList.add('active');
      query('.app-layout').inert = true;
      (el.querySelector<HTMLElement>('button') ?? el).focus();
    },
    close(el) {
      el.classList.remove('active');
      el.hidden = true;
      query('.app-layout').inert = false;
      const opener = this.opener;
      this.active = null;
      this.opener = null;
      if (opener?.isConnected) opener.focus();
    },
    init() {
      document.addEventListener('keydown', (event) => {
        const el = this.active;
        if (!el) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close(el);
          return;
        }
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex="0"]',
          ),
        ).filter((node) => !node.matches(':disabled') && node.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (!first || !last) {
          event.preventDefault();
          el.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    },
  };
}
export function createModal(focus: DialogFocus): Modal {
  return {
    init() {
      const overlay = element('modal-overlay');
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) this.close();
      });
      query('.modal-close', overlay).addEventListener('click', () => {
        this.close();
      });
    },
    open(type) {
      const content = modalContent[type];
      if (!content) return;
      const overlay = element('modal-overlay');
      query('.modal-title', overlay).textContent = content.title;
      query('.modal-body', overlay).innerHTML = content.body;
      focus.open(overlay);
    },
    close() {
      focus.close(element('modal-overlay'));
    },
  };
}
export function createSidepanel(focus: DialogFocus): Sidepanel {
  return {
    init() {
      query('.sidepanel-close', element('sidepanel')).addEventListener('click', () => {
        this.close();
      });
    },
    open(title, content, opener) {
      const panel = element('sidepanel');
      query('.sidepanel-title', panel).textContent = title;
      query('.sidepanel-body', panel).innerHTML = content;
      focus.open(panel, opener);
    },
    close() {
      focus.close(element('sidepanel'));
    },
  };
}
