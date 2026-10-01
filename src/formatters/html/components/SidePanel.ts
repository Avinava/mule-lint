/**
 * Side Panel Component
 * Slide-out drawer from right edge
 */

export const sidePanelHtml = `
<div id="sidepanel" class="sidepanel" role="dialog" aria-labelledby="sidepanel-title" tabindex="-1">
    <div class="sidepanel-header">
        <h3 class="sidepanel-title" id="sidepanel-title"></h3>
        <button type="button" class="sidepanel-close" aria-label="Close details" onclick="sidepanel.close()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    </div>
    <div class="sidepanel-body"></div>
</div>
`;

export const sidePanelScript = `
const sidepanel = {
    el: null,
    opener: null,
    init() {
        this.el = document.getElementById('sidepanel');
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.el.classList.contains('active')) this.close();
        });
    },
    open(title, content) {
        this.opener = document.activeElement;
        this.el.querySelector('.sidepanel-title').textContent = title;
        this.el.querySelector('.sidepanel-body').innerHTML = content;
        this.el.classList.add('active');
        this.el.focus();
    },
    close() {
        this.el.classList.remove('active');
        if (this.opener && typeof this.opener.focus === 'function') this.opener.focus();
        this.opener = null;
    }
};
`;
