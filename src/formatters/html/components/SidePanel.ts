/**
 * Side Panel Component
 * Slide-out drawer from right edge
 */

export const sidePanelHtml = `
<div id="sidepanel" class="sidepanel">
    <div class="sidepanel-header">
        <h3 class="sidepanel-title"></h3>
        <button class="sidepanel-close" onclick="sidepanel.close()">
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
    init() {
        this.el = document.getElementById('sidepanel');
    },
    open(title, content) {
        this.el.querySelector('.sidepanel-title').textContent = title;
        this.el.querySelector('.sidepanel-body').innerHTML = content;
        this.el.classList.add('active');
    },
    close() {
        this.el.classList.remove('active');
    }
};
`;
