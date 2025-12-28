/**
 * TechnicTools - Main Application
 * Engineering tools for Technic Brick builders
 */
const TechnicTools = (function() {
    'use strict';

    // Private state
    const modules = {};
    const initializedModules = new Set();
    let activeModuleId = null;

    /**
     * Register a module with the application
     * @param {string} id - The DOM id of the module container
     * @param {string} name - Display name of the module
     * @param {Function} initFn - Initialization function for the module
     */
    function registerModule(id, name, initFn) {
        modules[id] = {
            id: id,
            name: name,
            init: initFn
        };
    }

    /**
     * Switch to a specific module tab
     * @param {string} moduleId - The id of the module to switch to
     */
    function switchToModule(moduleId) {
        if (activeModuleId === moduleId) {
            return;
        }

        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            if (button.dataset.module === moduleId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Update module containers
        const moduleContainers = document.querySelectorAll('.module-container');
        moduleContainers.forEach(container => {
            if (container.id === moduleId) {
                container.classList.add('active');
            } else {
                container.classList.remove('active');
            }
        });

        activeModuleId = moduleId;

        // Initialize module on first view
        if (!initializedModules.has(moduleId) && modules[moduleId]) {
            initializeModule(moduleId);
        }
    }

    /**
     * Initialize a specific module
     * @param {string} moduleId - The id of the module to initialize
     */
    function initializeModule(moduleId) {
        const module = modules[moduleId];
        if (module && typeof module.init === 'function') {
            try {
                module.init();
                initializedModules.add(moduleId);
            } catch (error) {
                console.error(`Error initializing module ${moduleId}:`, error);
                const container = document.getElementById(moduleId);
                if (container) {
                    container.innerHTML = `<div class="error">Error loading module: ${error.message}</div>`;
                }
            }
        }
    }

    /**
     * Set up tab click handlers
     */
    function setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.dataset.module;
                switchToModule(moduleId);
            });
        });
    }

    /**
     * Initialize the application
     */
    function init() {
        setupTabs();

        // Find and activate the first tab/module
        const firstTab = document.querySelector('.tab-button');
        if (firstTab) {
            const firstModuleId = firstTab.dataset.module;
            switchToModule(firstModuleId);
        }
    }

    /**
     * DOM ready handler
     */
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    // Initialize when DOM is ready
    ready(init);

    // Public API
    return {
        registerModule: registerModule,
        switchToModule: switchToModule,
        getModules: function() {
            return Object.assign({}, modules);
        },
        isModuleInitialized: function(moduleId) {
            return initializedModules.has(moduleId);
        }
    };
})();
