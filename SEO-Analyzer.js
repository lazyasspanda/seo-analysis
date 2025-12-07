// ==UserScript==
// @name         SEO Analyzer Pro - DealerOn Edition v4.1
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Professional SEO analysis with summary overview and DealerOn branding
// @author       Pratik Chabria
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // DealerOn Color Palette
    const COLORS = {
        primary: '#19325d',
        secondary: '#1a3864',
        accent: '#fb741c',
        accentLight: '#ff8c42',
        success: '#2ecc71',
        warning: '#f39c12',
        error: '#e74c4c',
        text: '#1a202c',
        textLight: '#6b7280',
        background: '#ffffff',
        backgroundLight: '#f9fafb',
        border: '#e5e7eb'
    };

    // Dealer ID Detection
    function fetchDealerData() {
        try {
            const dataElement = document.querySelector('#dealeron_tagging_data');
            if (dataElement) {
                const dealerData = JSON.parse(dataElement.textContent);
                return {
                    dealerId: dealerData.dealerId,
                    pageId: dealerData.pageId,
                    isVerified: true
                };
            }
        } catch (error) {
            console.error("Error fetching Dealer data:", error);
        }
        return { dealerId: null, pageId: null, isVerified: false };
    }

    // SEO Standards
    const SEO_STANDARDS = {
        metaTitle: { minChars: 50, maxChars: 60, maxPixels: 600, required: true },
        metaDescription: { minChars: 120, maxChars: 160, required: true },
        h1: { min: 1, max: 1, minChars: 20, maxChars: 70 },
        h2: { min: 2, max: 10 },
        imageAlt: { required: true, minChars: 5, maxChars: 125 },
        internalLinks: { min: 3 }
    };

    let analysisResults = {};
    let highlightedElements = [];
    let panelState = {
        isVisible: false,
        currentTab: 'summary',
        scrollPosition: 0
    };

    // Create floating button
    function createFloatingButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'seo-analyzer-container';
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const button = document.createElement('button');
        button.id = 'seo-analyzer-btn';
        button.innerHTML = '🔍 SEO Analysis';
        button.style.cssText = `
            background: ${COLORS.primary};
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(25, 50, 93, 0.3);
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            position: relative;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.id = 'seo-analyzer-close';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: ${COLORS.error};
            color: white;
            border: 2px solid white;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            line-height: 1;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        `;

        buttonContainer.appendChild(button);
        buttonContainer.appendChild(closeBtn);

        buttonContainer.addEventListener('mouseenter', () => {
            button.style.background = COLORS.secondary;
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(25, 50, 93, 0.4)';
            closeBtn.style.display = 'flex';
        });

        buttonContainer.addEventListener('mouseleave', () => {
            button.style.background = COLORS.primary;
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(25, 50, 93, 0.3)';
            closeBtn.style.display = 'none';
        });

        button.addEventListener('click', () => {
            if (panelState.isVisible) {
                showAnalysisPanel();
            } else {
                runSEOAnalysis();
                showAnalysisPanel();
            }
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            buttonContainer.style.transition = 'all 0.3s ease';
            buttonContainer.style.opacity = '0';
            buttonContainer.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                buttonContainer.remove();
            }, 300);
        });

        // Add global styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translate(-50%, -45%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translate(-50%, -50%); }
                to { opacity: 0; transform: translate(-50%, -45%); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.03); opacity: 0.8; }
            }
            .seo-tab {
                transition: all 0.2s ease;
            }
            .seo-tab:hover {
                background: ${COLORS.backgroundLight} !important;
            }
            .seo-tab.active {
                background: ${COLORS.primary} !important;
                color: white !important;
                border-bottom: 3px solid ${COLORS.accent} !important;
            }
            .collapsible-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }
            .collapsible-content.expanded {
                max-height: 1500px;
            }
            .seo-overlay {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(buttonContainer);
    }

    // Run SEO Analysis
    function runSEOAnalysis() {
        clearHighlights();
        analysisResults = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            metaTags: analyzeMetaTags(),
            headings: analyzeHeadings(),
            images: analyzeImages(),
            links: analyzeLinks(),
            content: analyzeContent(),
            technical: analyzeTechnical()
        };

        calculateScores();
    }

    // Analysis Functions (keeping your existing logic)
    function analyzeMetaTags() {
        const results = { issues: [], suggestions: [], details: {}, elements: [] };

        const titleTag = document.querySelector('title');
        const titleText = titleTag ? titleTag.textContent.trim() : '';
        const titleLength = titleText.length;

        results.details.title = { text: titleText, length: titleLength, exists: !!titleTag };

        if (!titleTag || !titleText) {
            results.issues.push({
                severity: 'critical',
                type: 'Missing Title Tag',
                message: 'No title tag found on this page',
                element: null,
                selector: '<head>',
                currentValue: 'None',
                suggestion: 'Add a unique, descriptive title tag (50-60 characters) with your primary keyword',
                example: '<title>2024 Honda Civic for Sale | YourDealership</title>'
            });
        } else {
            if (titleLength < SEO_STANDARDS.metaTitle.minChars) {
                results.issues.push({
                    severity: 'warning',
                    type: 'Title Too Short',
                    message: `Title is only ${titleLength} characters (recommended: 50-60)`,
                    element: titleTag,
                    selector: 'title',
                    currentValue: titleText,
                    suggestion: 'Expand title to 50-60 characters for better search visibility',
                    example: 'Add location, model year, or unique selling points'
                });
            } else if (titleLength > SEO_STANDARDS.metaTitle.maxChars) {
                results.issues.push({
                    severity: 'warning',
                    type: 'Title Too Long',
                    message: `Title is ${titleLength} characters (max: 60)`,
                    element: titleTag,
                    selector: 'title',
                    currentValue: titleText,
                    suggestion: 'Shorten to under 60 characters to prevent truncation in search results',
                    example: titleText.substring(0, 57) + '...'
                });
            }
        }

        const metaDesc = document.querySelector('meta[name="description"]');
        const descText = metaDesc ? metaDesc.getAttribute('content').trim() : '';
        const descLength = descText.length;

        if (!metaDesc || !descText) {
            results.issues.push({
                severity: 'critical',
                type: 'Missing Meta Description',
                message: 'No meta description found',
                element: null,
                selector: '<head>',
                currentValue: 'None',
                suggestion: 'Add compelling meta description (120-160 characters) with call-to-action',
                example: '<meta name="description" content="Browse our inventory of certified pre-owned vehicles. Get financing, trade-ins, and test drives. Visit us today!">'
            });
        } else if (descLength < SEO_STANDARDS.metaDescription.minChars) {
            results.issues.push({
                severity: 'warning',
                type: 'Meta Description Too Short',
                message: `Description is ${descLength} characters (recommended: 120-160)`,
                element: metaDesc,
                selector: 'meta[name="description"]',
                currentValue: descText,
                suggestion: 'Expand to 120-160 characters with compelling details and CTA',
                example: 'Add more information about your services, location, and unique value'
            });
        } else if (descLength > SEO_STANDARDS.metaDescription.maxChars) {
            results.issues.push({
                severity: 'minor',
                type: 'Meta Description Too Long',
                message: `Description is ${descLength} characters (will be truncated after 160)`,
                element: metaDesc,
                selector: 'meta[name="description"]',
                currentValue: descText,
                suggestion: 'Shorten to 120-160 characters',
                example: descText.substring(0, 157) + '...'
            });
        }

        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            results.issues.push({
                severity: 'critical',
                type: 'Missing Viewport Meta Tag',
                message: 'Page not optimized for mobile devices',
                element: null,
                selector: '<head>',
                currentValue: 'None',
                suggestion: 'Add viewport meta tag for mobile responsiveness',
                example: '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
            });
        }

        return results;
    }

    function analyzeHeadings() {
        const results = { issues: [], suggestions: [], details: {}, elements: [] };

        const h1Tags = document.querySelectorAll('h1');
        results.details.h1 = { count: h1Tags.length };

        if (h1Tags.length === 0) {
            results.issues.push({
                severity: 'critical',
                type: 'Missing H1 Tag',
                message: 'No H1 tag found on page',
                element: null,
                selector: 'Body content',
                currentValue: 'None',
                suggestion: 'Add exactly one H1 tag as the main page heading',
                example: '<h1>New & Used Cars for Sale in [City]</h1>'
            });
        } else if (h1Tags.length > 1) {
            h1Tags.forEach((h1, index) => {
                results.elements.push({ element: h1, type: 'h1-multiple' });
                results.issues.push({
                    severity: 'warning',
                    type: `Multiple H1 Tags (H1 #${index + 1})`,
                    message: `Found ${h1Tags.length} H1 tags (should be exactly 1)`,
                    element: h1,
                    selector: getElementSelector(h1),
                    currentValue: h1.textContent.trim(),
                    suggestion: index === 0 ? 'Keep this as your main H1' : 'Change this to H2 or H3',
                    example: '<h2>' + h1.textContent.trim() + '</h2>'
                });
            });
        }

        const h2Tags = document.querySelectorAll('h2');
        if (h2Tags.length < 2) {
            results.issues.push({
                severity: 'warning',
                type: 'Insufficient H2 Tags',
                message: `Only ${h2Tags.length} H2 tag(s) found - recommend 2-4`,
                element: null,
                selector: 'Body content',
                currentValue: h2Tags.length + ' H2 tags',
                suggestion: 'Add H2 tags to break content into clear sections',
                example: '<h2>Our Services</h2>, <h2>Why Choose Us</h2>, etc.'
            });
        }

        return results;
    }

    function analyzeImages() {
        const results = { issues: [], suggestions: [], details: {}, elements: [] };
        const images = document.querySelectorAll('img');
        results.details.totalImages = images.length;

        images.forEach((img, index) => {
            const alt = img.getAttribute('alt');
            const src = img.getAttribute('src');

            if (alt === null) {
                results.elements.push({ element: img, type: 'missing-alt' });
                results.issues.push({
                    severity: 'critical',
                    type: `Missing Alt Text (Image #${index + 1})`,
                    message: 'Image missing alt attribute',
                    element: img,
                    selector: getElementSelector(img),
                    currentValue: `src="${src ? src.substring(0, 40) + '...' : 'unknown'}"`,
                    suggestion: 'Add descriptive alt text (5-125 characters)',
                    example: 'alt="2024 Honda Civic exterior front view"'
                });
            } else if (alt !== '' && alt.length < 5) {
                results.elements.push({ element: img, type: 'short-alt' });
                results.issues.push({
                    severity: 'warning',
                    type: `Alt Text Too Short (Image #${index + 1})`,
                    message: `Alt text is only ${alt.length} characters`,
                    element: img,
                    selector: getElementSelector(img),
                    currentValue: `alt="${alt}"`,
                    suggestion: 'Expand alt text to at least 5 characters',
                    example: 'Be more descriptive about the image content'
                });
            }
        });

        return results;
    }

    function analyzeLinks() {
    const results = { issues: [], suggestions: [], details: {}, elements: [] };
    const allLinks = document.querySelectorAll('a');
    const internalLinks = [];

    allLinks.forEach((link, index) => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        const linkId = link.getAttribute('id');

        // Filter out parent navigation links (they're placeholders for dropdowns)
        const isParentNav = linkId && linkId.match(/^parent_\d+$/);

        if (!href || href === '#' || href === '') {
            // Skip if it's a parent navigation element
            if (isParentNav) {
                return; // Don't flag as broken - it's intentional
            }

            results.elements.push({ element: link, type: 'broken-link' });
            results.issues.push({
                severity: 'critical',
                type: `Broken Link (Link #${index + 1})`,
                message: 'Link has empty or invalid href',
                element: link,
                selector: getElementSelector(link),
                currentValue: `href="${href || 'empty'}" text="${text}"`,
                suggestion: 'Add valid URL or remove the link',
                example: '<a href="/inventory">View Inventory</a>'
            });
        }

        const isInternal = href && (href.startsWith('/') || href.startsWith('#') || href.includes(window.location.hostname));
        if (isInternal) internalLinks.push(link);
    });

    results.details.totalLinks = allLinks.length;
    results.details.internalLinks = internalLinks.length;

    if (internalLinks.length < 3) {
        results.issues.push({
            severity: 'warning',
            type: 'Insufficient Internal Links',
            message: `Only ${internalLinks.length} internal link(s) found`,
            element: null,
            selector: 'Page content',
            currentValue: `${internalLinks.length} internal links`,
            suggestion: 'Add 3-5 internal links to related pages',
            example: 'Link to inventory, services, contact, etc.'
        });
    }

    return results;
}


    function analyzeContent() {
        const results = { issues: [], suggestions: [], details: {}, elements: [] };
        const bodyText = document.body.innerText;
        const wordCount = bodyText.trim().split(/\s+/).length;
        results.details.wordCount = wordCount;

        if (wordCount < 300) {
            results.issues.push({
                severity: 'warning',
                type: 'Thin Content',
                message: `Page has only ${wordCount} words (recommended: 300+)`,
                element: document.body,
                selector: 'body',
                currentValue: `${wordCount} words`,
                suggestion: 'Add more comprehensive content for better SEO',
                example: 'Expand with details about products, services, location, testimonials'
            });
        }

        return results;
    }

    function analyzeTechnical() {
        const results = { issues: [], suggestions: [], details: {}, elements: [] };

        if (window.location.protocol !== 'https:') {
            results.issues.push({
                severity: 'critical',
                type: 'No HTTPS',
                message: 'Page not served over HTTPS',
                element: null,
                selector: 'Entire site',
                currentValue: 'http://',
                suggestion: 'Migrate entire site to HTTPS with SSL certificate',
                example: 'Contact your hosting provider to enable SSL'
            });
        }

        const scripts = document.querySelectorAll('script[src]');
        if (scripts.length > 15) {
            results.issues.push({
                severity: 'warning',
                type: 'Too Many Scripts',
                message: `${scripts.length} external scripts may impact performance`,
                element: null,
                selector: '<head> and <body>',
                currentValue: `${scripts.length} scripts`,
                suggestion: 'Consolidate and minify JavaScript files',
                example: 'Combine scripts or use async/defer attributes'
            });
        }

        return results;
    }

    // Calculate Scores
    function calculateScores() {
        const categories = ['metaTags', 'headings', 'images', 'links', 'content', 'technical'];
        let totalScore = 0;
        let totalIssues = 0;

        categories.forEach(cat => {
            const issues = analysisResults[cat].issues;
            let score = 100;

            issues.forEach(issue => {
                if (issue.severity === 'critical') score -= 15;
                else if (issue.severity === 'warning') score -= 8;
                else if (issue.severity === 'minor') score -= 3;
            });

            score = Math.max(0, score);
            analysisResults[cat].score = score;
            totalScore += score;
            totalIssues += issues.length;
        });

        analysisResults.overallScore = Math.round(totalScore / categories.length);
        analysisResults.totalIssues = totalIssues;
    }

    // Get Element Selector
    function getElementSelector(element) {
        if (!element) return 'Unknown';
        if (element.id) return `#${element.id}`;

        let path = element.tagName.toLowerCase();
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c => c && !c.includes('seo-'));
            if (classes.length > 0) {
                path += '.' + classes.slice(0, 2).join('.');
            }
        }

        return path;
    }

    // Highlight Element
    function highlightElement(element) {
        if (!element || !element.getBoundingClientRect) return;

        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        const overlay = document.createElement('div');
        overlay.className = 'seo-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: ${rect.top + scrollTop}px;
            left: ${rect.left + scrollLeft}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 3px solid ${COLORS.accent};
            background: rgba(251, 116, 28, 0.15);
            z-index: 999997;
            pointer-events: none;
            border-radius: 4px;
            box-shadow: 0 0 0 4px rgba(251, 116, 28, 0.1), 0 0 20px rgba(251, 116, 28, 0.3);
        `;

        const label = document.createElement('div');
        label.innerHTML = '⚠️ SEO Issue';
        label.style.cssText = `
            position: absolute;
            top: -32px;
            left: 0;
            background: ${COLORS.accent};
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            white-space: nowrap;
        `;

        overlay.appendChild(label);
        document.body.appendChild(overlay);
        highlightedElements.push(overlay);

        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Clear Highlights
    function clearHighlights() {
        highlightedElements.forEach(overlay => {
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
        });
        highlightedElements = [];
    }

    // Show Analysis Panel
    function showAnalysisPanel() {
        const existingPanel = document.getElementById('seo-analysis-panel');
        const existingBackdrop = document.getElementById('seo-panel-backdrop');

        if (existingPanel && panelState.isVisible) {
            existingPanel.style.display = 'flex';
            existingPanel.style.animation = 'slideUp 0.3s ease forwards';
            existingBackdrop.style.display = 'block';
            existingBackdrop.style.animation = 'fadeIn 0.3s ease forwards';
            panelState.isVisible = true;
            clearHighlights();
            return;
        }

        if (existingPanel) existingPanel.remove();
        if (existingBackdrop) existingBackdrop.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'seo-panel-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999998;
            animation: fadeIn 0.3s ease forwards;
        `;
        document.body.appendChild(backdrop);

        const panel = document.createElement('div');
        panel.id = 'seo-analysis-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50% !important;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1200px;
            max-height: 85vh;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            animation: slideUp 0.3s ease forwards;
        `;

        panel.innerHTML = generatePanelHTML();
        document.body.appendChild(panel);

        panelState.isVisible = true;

        // Event listeners
        document.getElementById('close-panel-btn').addEventListener('click', hidePanel);
        document.getElementById('download-report-btn').addEventListener('click', downloadReport);
        backdrop.addEventListener('click', hidePanel);

        // Tab switching
        document.querySelectorAll('.seo-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.getAttribute('data-tab'));
            });
        });

        // Highlight buttons
        document.querySelectorAll('.highlight-element-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                const category = btn.getAttribute('data-category');
                const issue = analysisResults[category].issues[index];

                if (issue.element) {
                    hidePanel();
                    setTimeout(() => {
                        highlightElement(issue.element);
                    }, 400);
                }
            });
        });

        // Collapsible issues
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.collapse-icon');
                content.classList.toggle('expanded');
                icon.textContent = content.classList.contains('expanded') ? '▼' : '▶';
            });
        });
    }

    // Hide Panel
    function hidePanel() {
        const panel = document.getElementById('seo-analysis-panel');
        const backdrop = document.getElementById('seo-panel-backdrop');

        if (panel) {
            panel.style.animation = 'slideDown 0.3s ease forwards';
            backdrop.style.animation = 'fadeOut 0.3s ease forwards';

            setTimeout(() => {
                panel.style.display = 'none';
                backdrop.style.display = 'none';
            }, 300);
        }

        panelState.isVisible = false;
        clearHighlights();
    }

    // Switch Tab
    function switchTab(tabName) {
        panelState.currentTab = tabName;

        document.querySelectorAll('.seo-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });

        document.querySelector(`.seo-tab[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).style.display = 'block';
    }

    // Generate Panel HTML
    function generatePanelHTML() {
        const categories = [
            { key: 'summary', title: 'Summary', icon: '📊', desc: 'Overview of all SEO issues' },
            { key: 'metaTags', title: 'Meta Tags', icon: '🏷️', desc: 'Title, description, and viewport optimization' },
            { key: 'headings', title: 'Headings', icon: '📑', desc: 'H1-H6 structure and hierarchy' },
            { key: 'images', title: 'Images', icon: '🖼️', desc: 'Alt text and image optimization' },
            { key: 'links', title: 'Links', icon: '🔗', desc: 'Internal and external link analysis' },
            { key: 'content', title: 'Content', icon: '📝', desc: 'Word count and content quality' },
            { key: 'technical', title: 'Technical', icon: '⚙️', desc: 'HTTPS, scripts, and performance' }
        ];

        let html = `
            <div style="padding: 24px 30px; border-bottom: 1px solid ${COLORS.border}; background: ${COLORS.primary}; color: white; border-radius: 12px 12px 0 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0; font-size: 22px; font-weight: 700;">SEO Analysis Report</h2>
                        <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">${window.location.hostname}</p>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="text-align: center; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); padding: 12px 20px; border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: 700;">${analysisResults.overallScore}</div>
                            <div style="font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Score</div>
                        </div>
                        <button id="download-report-btn" style="background: white; color: ${COLORS.primary}; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                            📥 Download
                        </button>
                        <button id="close-panel-btn" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 36px; height: 36px; border-radius: 6px; cursor: pointer; font-size: 20px; font-weight: 700;">×</button>
                    </div>
                </div>
            </div>

            <<div style="display: flex; border-bottom: 1px solid ${COLORS.border}; background: ${COLORS.backgroundLight}; overflow-x: auto; flex-shrink: 0; white-space: nowrap; -webkit-overflow-scrolling: touch;">
        `;

        // Tabs
        categories.forEach((cat, index) => {
            if (cat.key === 'summary') {
                html += `
                    <button class="seo-tab ${index === 0 ? 'active' : ''}" data-tab="${cat.key}" style="
                        padding: 14px 20px;
                        border: none;
                        background: ${index === 0 ? COLORS.primary : 'transparent'};
                        color: ${index === 0 ? 'white' : COLORS.textLight};
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                        white-space: nowrap;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-shrink: 0;
                        border-bottom: 3px solid ${index === 0 ? COLORS.accent : 'transparent'};
                    ">
                        <span>${cat.icon}</span>
                        <span>${cat.title}</span>
                        <span style="background: ${COLORS.error}; color: white; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 700;">${analysisResults.totalIssues}</span>
                    </button>
                `;
            } else {
                const data = analysisResults[cat.key];
                const issueCount = data.issues.length;

                html += `
                    <button class="seo-tab ${index === 0 ? 'active' : ''}" data-tab="${cat.key}" style="
                        padding: 14px 20px;
                        border: none;
                        background: ${index === 0 ? COLORS.primary : 'transparent'};
                        color: ${index === 0 ? 'white' : COLORS.textLight};
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                        white-space: nowrap;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-shrink: 0;
                        border-bottom: 3px solid ${index === 0 ? COLORS.accent : 'transparent'};
                    ">
                        <span>${cat.icon}</span>
                        <span>${cat.title}</span>
                        ${issueCount > 0 ? `<span style="background: ${COLORS.error}; color: white; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 700;">${issueCount}</span>` : ''}
                    </button>
                `;
            }
        });

        html += `</div><div style="flex: 1; overflow-y: auto; padding: 0;">`;

        // Tab contents
        categories.forEach((cat, index) => {
            html += `<div id="tab-${cat.key}" class="tab-content" style="display: ${index === 0 ? 'block' : 'none'}; padding: 24px;">`;
            if (cat.key === 'summary') {
                html += generateSummaryContent();
            } else {
                html += generateTabContent(cat.key, cat.title, cat.icon, cat.desc);
            }
            html += `</div>`;
        });

        html += `</div>`;

        return html;
    }

    // Generate Summary Content
    function generateSummaryContent() {
        const scoreColor = analysisResults.overallScore >= 80 ? COLORS.success : analysisResults.overallScore >= 60 ? COLORS.warning : COLORS.error;

        let html = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: ${COLORS.text};">📊 Summary Overview</h3>
                    <div style="background: ${scoreColor}; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 16px;">
                        ${analysisResults.overallScore}/100
                    </div>
                </div>
                <p style="margin: 0; color: ${COLORS.textLight}; font-size: 13px;">Complete overview of all SEO issues found on this page</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: rgba(231, 76, 76, 0.1); padding: 16px; border-radius: 8px; border-left: 4px solid ${COLORS.error};">
                    <div style="font-size: 11px; color: ${COLORS.textLight}; margin-bottom: 4px;">Critical Issues</div>
                    <div style="font-size: 32px; font-weight: 700; color: ${COLORS.error};">${getCriticalCount()}</div>
                </div>
                <div style="background: rgba(243, 156, 18, 0.1); padding: 16px; border-radius: 8px; border-left: 4px solid ${COLORS.warning};">
                    <div style="font-size: 11px; color: ${COLORS.textLight}; margin-bottom: 4px;">Warnings</div>
                    <div style="font-size: 32px; font-weight: 700; color: ${COLORS.warning};">${getWarningCount()}</div>
                </div>
                <div style="background: rgba(107, 114, 128, 0.1); padding: 16px; border-radius: 8px; border-left: 4px solid ${COLORS.textLight};">
                    <div style="font-size: 11px; color: ${COLORS.textLight}; margin-bottom: 4px;">Minor Issues</div>
                    <div style="font-size: 32px; font-weight: 700; color: ${COLORS.textLight};">${getMinorCount()}</div>
                </div>
            </div>

            <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid ${COLORS.border}; margin-bottom: 20px;">
                <h4 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: ${COLORS.text};">🎯 Top Priority Issues</h4>
                ${generateTopPriorityIssues()}
            </div>
        `;

        return html;
    }

    function getCriticalCount() {
        let count = 0;
        ['metaTags', 'headings', 'images', 'links', 'content', 'technical'].forEach(cat => {
            count += analysisResults[cat].issues.filter(i => i.severity === 'critical').length;
        });
        return count;
    }

    function getWarningCount() {
        let count = 0;
        ['metaTags', 'headings', 'images', 'links', 'content', 'technical'].forEach(cat => {
            count += analysisResults[cat].issues.filter(i => i.severity === 'warning').length;
        });
        return count;
    }

    function getMinorCount() {
        let count = 0;
        ['metaTags', 'headings', 'images', 'links', 'content', 'technical'].forEach(cat => {
            count += analysisResults[cat].issues.filter(i => i.severity === 'minor').length;
        });
        return count;
    }

    function generateTopPriorityIssues() {
        const allIssues = [];
        const categoryMap = {
            metaTags: 'Meta Tags',
            headings: 'Headings',
            images: 'Images',
            links: 'Links',
            content: 'Content',
            technical: 'Technical'
        };

        ['metaTags', 'headings', 'images', 'links', 'content', 'technical'].forEach(cat => {
            analysisResults[cat].issues.forEach(issue => {
                allIssues.push({ ...issue, category: cat, categoryName: categoryMap[cat] });
            });
        });

        // Sort by severity
        const priorityOrder = { critical: 1, warning: 2, minor: 3 };
        allIssues.sort((a, b) => priorityOrder[a.severity] - priorityOrder[b.severity]);

        // Take top 5
        const topIssues = allIssues.slice(0, 5);

        if (topIssues.length === 0) {
            return `<div style="text-align: center; padding: 40px 20px; background: rgba(46, 204, 113, 0.1); border-radius: 8px;">
                        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                        <p style="margin: 0; color: ${COLORS.success}; font-size: 16px; font-weight: 600;">Perfect! No issues found.</p>
                    </div>`;
        }

        let html = '';
        topIssues.forEach((issue, index) => {
            const severityColor = issue.severity === 'critical' ? COLORS.error : issue.severity === 'warning' ? COLORS.warning : COLORS.textLight;
            const severityIcon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';

            html += `
                <div style="padding: 14px; background: ${COLORS.backgroundLight}; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${severityColor};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="font-size: 12px; color: ${severityColor}; font-weight: 700; margin-bottom: 6px;">
                                ${severityIcon} ${issue.type}
                            </div>
                            <div style="font-size: 13px; color: ${COLORS.text}; margin-bottom: 4px;">
                                ${issue.message}
                            </div>
                            <div style="font-size: 11px; color: ${COLORS.textLight};">
                                Category: ${issue.categoryName}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${COLORS.border};">
                        <div style="font-size: 11px; font-weight: 600; color: ${COLORS.success}; margin-bottom: 4px;">✅ Recommendation:</div>
                        <div style="font-size: 12px; color: ${COLORS.text};">
                            ${issue.suggestion}
                        </div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    // Generate Tab Content (existing function with word wrap fix)
    function generateTabContent(categoryKey, categoryTitle, categoryIcon, categoryDesc) {
        const data = analysisResults[categoryKey];
        const scoreColor = data.score >= 80 ? COLORS.success : data.score >= 60 ? COLORS.warning : COLORS.error;

        let html = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: ${COLORS.text};">${categoryIcon} ${categoryTitle}</h3>
                    <div style="background: ${scoreColor}; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 16px;">
                        ${data.score}/100
                    </div>
                </div>
                <p style="margin: 0; color: ${COLORS.textLight}; font-size: 13px;">${categoryDesc}</p>
            </div>
        `;

        if (data.issues.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px 20px; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border: 2px dashed ${COLORS.success};">
                    <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                    <h4 style="margin: 0 0 8px 0; color: ${COLORS.success}; font-size: 18px;">Perfect!</h4>
                    <p style="margin: 0; color: ${COLORS.textLight}; font-size: 14px;">No issues found in this category.</p>
                </div>
            `;
        } else {
            data.issues.forEach((issue, index) => {
                const severityColor = issue.severity === 'critical' ? COLORS.error : issue.severity === 'warning' ? COLORS.warning : COLORS.textLight;
                const severityIcon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';

                html += `
                    <div style="background: white; border-radius: 8px; margin-bottom: 12px; border: 1px solid ${COLORS.border}; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <div class="collapsible-header" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: ${COLORS.backgroundLight};">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: ${COLORS.text}; font-size: 14px; margin-bottom: 4px;">
                                    ${severityIcon} ${issue.type}
                                </div>
                                <div style="color: ${COLORS.textLight}; font-size: 13px;">
                                    ${issue.message}
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${issue.element ? `<button class="highlight-element-btn" data-category="${categoryKey}" data-index="${index}" style="background: ${COLORS.accent}; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap;">View on Page</button>` : ''}
                                <span class="collapse-icon" style="font-size: 10px; color: ${COLORS.textLight};">▶</span>
                            </div>
                        </div>
                        <div class="collapsible-content" style="padding: 0 16px; background: white;">
                            <div style="padding: 16px 0; border-top: 1px solid ${COLORS.border};">
                                <div style="margin-bottom: 12px;">
                                    <div style="font-weight: 600; color: ${COLORS.text}; font-size: 12px; margin-bottom: 6px;">📍 Location</div>
                                    <div style="background: ${COLORS.backgroundLight}; padding: 8px 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; color: ${COLORS.textLight}; word-break: break-all;">
                                        ${issue.selector}
                                    </div>
                                </div>

                                <div style="margin-bottom: 12px;">
                                    <div style="font-weight: 600; color: ${COLORS.text}; font-size: 12px; margin-bottom: 6px;">📝 Current Value</div>
                                    <div style="background: rgba(231, 76, 76, 0.05); padding: 8px 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; color: ${COLORS.error}; word-break: break-all; max-height: 100px; overflow-y: auto; white-space: pre-wrap;">
                                        ${issue.currentValue}
                                    </div>
                                </div>

                                <div style="margin-bottom: 12px;">
                                    <div style="font-weight: 600; color: ${COLORS.success}; font-size: 12px; margin-bottom: 6px;">✅ Recommendation</div>
                                    <div style="background: rgba(46, 204, 113, 0.1); padding: 10px 12px; border-radius: 4px; font-size: 12px; color: ${COLORS.text}; border-left: 3px solid ${COLORS.success};">
                                        ${issue.suggestion}
                                    </div>
                                </div>

                                <div>
                                    <div style="font-weight: 600; color: ${COLORS.textLight}; font-size: 12px; margin-bottom: 6px;">💡 Example</div>
                                    <div style="background: ${COLORS.backgroundLight}; padding: 8px 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; color: ${COLORS.text}; border: 1px dashed ${COLORS.border}; word-break: break-all; max-height: 120px; overflow-y: auto; white-space: pre-wrap;">
                                        ${issue.example}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        return html;
    }

    // Download Report
    function downloadReport() {
        const csv = generateCSVReport();
        const csvBlob = new Blob([csv], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `SEO-Analysis-${window.location.hostname}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);
    }

    // Generate CSV Report
    function generateCSVReport() {
        let csv = 'Category,Severity,Issue Type,Message,Location,Current Value,Recommendation,Example\n';

        const categories = ['metaTags', 'headings', 'images', 'links', 'content', 'technical'];
        const categoryNames = {
            metaTags: 'Meta Tags',
            headings: 'Headings',
            images: 'Images',
            links: 'Links',
            content: 'Content',
            technical: 'Technical'
        };

        categories.forEach(cat => {
            const data = analysisResults[cat];
            if (!data) return;

            data.issues.forEach(issue => {
                const clean = (str) => str.replace(/"/g, '""').replace(/\n/g, ' ');
                csv += `"${categoryNames[cat]}","${issue.severity}","${issue.type}","${clean(issue.message)}","${clean(issue.selector)}","${clean(issue.currentValue)}","${clean(issue.suggestion)}","${clean(issue.example)}"\n`;
            });
        });

        return csv;
    }

    // Initialize
    function init() {
        const dealerData = fetchDealerData();

        if (!dealerData.isVerified) {
            console.log('SEO Analyzer: No dealer ID detected. Tool will not load.');
            return;
        }

        console.log('SEO Analyzer: Dealer verified -', dealerData.dealerId);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createFloatingButton);
        } else {
            createFloatingButton();
        }
    }

    init();
})();
