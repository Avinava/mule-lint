/**
 * Side Panel Component
 * Slide-out drawer from right edge
 */

export const sidePanelHtml = `
<div id="sidepanel" class="sidepanel" hidden aria-modal="true" role="dialog" aria-labelledby="sidepanel-title" tabindex="-1">
    <div class="sidepanel-header">
        <h3 class="sidepanel-title" id="sidepanel-title"></h3>
        <button type="button" class="sidepanel-close" aria-label="Close details" >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    </div>
    <div class="sidepanel-body"></div>
</div>
`;
