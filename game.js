class SpaceBaseGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.modules = [];
        this.corridors = [];
        this.selectedModule = null;
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.selectedModuleType = null;
        this.environment = 'moon';
        this.crewCount = 4;
        this.missionDuration = 30;
        this.baseOutline = { x: 50, y: 50, width: 400, height: 300 };
        this.corridorMode = false;
        this.corridorStart = null;
        
        // Environment constraints
        this.environments = {
            moon: {
                name: 'Moon',
                gravity: 0.16,
                atmosphere: 'none',
                radiation: 'high',
                maxWidth: 8.4, // meters
                maxHeight: 8.4,
                background: '#1a1a2e'
            },
            mars: {
                name: 'Mars',
                gravity: 0.38,
                atmosphere: 'thin',
                radiation: 'high',
                maxWidth: 8.4,
                maxHeight: 8.4,
                background: '#2d1b1b'
            },
            orbit: {
                name: 'Earth Orbit',
                gravity: 0,
                atmosphere: 'none',
                radiation: 'extreme',
                maxWidth: 5.2,
                maxHeight: 5.2,
                background: '#0c0c0c'
            }
        };

        // Module requirements per crew member
        this.moduleRequirements = {
            kitchen: { area: 2.5, volume: 7.5, power: 2 },
            lab: { area: 3, volume: 9, power: 3 },
            gym: { area: 2, volume: 6, power: 1.5 },
            sleeping: { area: 1.5, volume: 4.5, power: 0.5 },
            hygiene: { area: 1.5, volume: 4.5, power: 1 },
            storage: { area: 2, volume: 6, power: 0.5 },
            medical: { area: 1.5, volume: 4.5, power: 1 },
            recreation: { area: 1.5, volume: 4.5, power: 1 }
        };

        // Daily resource consumption per crew member
        this.dailyConsumption = {
            food: 3.5, // kg
            water: 3.8, // liters
            oxygen: 0.83, // kg
            exercise: 2 // hours
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCanvasSize();
        this.gameLoop();
        this.updateResourceDisplay();
    }

    setupEventListeners() {
        // Environment and crew controls
        document.getElementById('environment').addEventListener('change', (e) => {
            this.environment = e.target.value;
            this.updateEnvironment();
        });

        document.getElementById('crew-count').addEventListener('change', (e) => {
            this.crewCount = parseInt(e.target.value);
            this.updateResourceDisplay();
        });

        document.getElementById('duration').addEventListener('change', (e) => {
            this.missionDuration = parseInt(e.target.value);
            this.updateResourceDisplay();
        });

        // Module palette
        document.querySelectorAll('.module-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectModuleType(e.currentTarget.dataset.type);
            });
        });

        // Mission scenarios
        document.getElementById('scenario-select').addEventListener('change', (e) => {
            this.loadScenario(e.target.value);
        });

        // Action buttons
        document.getElementById('save-design').addEventListener('click', () => this.saveDesign());
        document.getElementById('load-design').addEventListener('click', () => this.loadDesign());
        document.getElementById('clear-base').addEventListener('click', () => this.clearBase());
        document.getElementById('export-image').addEventListener('click', () => this.exportImage());

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Window resize
        window.addEventListener('resize', () => this.updateCanvasSize());

        // AI controls
        const aiToggle = document.getElementById('ai-toggle');
        const aiAnalyze = document.getElementById('ai-analyze');
        if (aiToggle) {
            aiToggle.addEventListener('change', () => {
                this.useAIWarnings = aiToggle.checked;
                this.updateResourceDisplay();
            });
        }
        if (aiAnalyze) {
            aiAnalyze.addEventListener('click', () => this.requestAIAnalysis());
        }
    }

    updateCanvasSize() {
        const container = document.getElementById('canvas-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.draw();
    }

    selectModuleType(type) {
        // Remove previous selection
        document.querySelectorAll('.module-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Select new type
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
        this.selectedModuleType = type;
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on existing module
        const clickedModule = this.getModuleAt(x, y);
        
        if (clickedModule) {
            this.selectedModule = clickedModule;
            this.dragging = true;
            this.dragOffset = {
                x: x - clickedModule.x,
                y: y - clickedModule.y
            };
        } else if (this.selectedModuleType && this.isWithinBaseOutline(x, y)) {
            // Create new module
            const module = this.createModule(x, y, this.selectedModuleType);
            this.modules.push(module);
            this.selectedModule = module;
            this.dragging = true;
            this.dragOffset = { x: 0, y: 0 };
        } else if (e.button === 2) { // Right click for corridor mode
            this.startCorridorMode(x, y);
        }

        this.updateResourceDisplay();
        this.draw();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.dragging && this.selectedModule) {
            // Update module position
            this.selectedModule.x = Math.max(0, x - this.dragOffset.x);
            this.selectedModule.y = Math.max(0, y - this.dragOffset.y);

            // Keep within base outline
            this.constrainModuleToBase(this.selectedModule);

            this.updateResourceDisplay();
        } else if (this.corridorMode && this.corridorStart) {
            // Show corridor preview
            this.corridorPreview = { start: this.corridorStart, end: { x, y } };
        }

        this.draw();
    }

    handleMouseUp(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.corridorMode && this.corridorStart) {
            // Complete corridor creation
            this.createCorridor(this.corridorStart, { x, y });
            this.corridorMode = false;
            this.corridorStart = null;
            this.corridorPreview = null;
            this.canvas.style.cursor = 'crosshair';
            this.updateResourceDisplay();
        }

        this.dragging = false;
        this.selectedModule = null;
        this.updateResourceDisplay();
    }

    createModule(x, y, type) {
        const requirements = this.moduleRequirements[type];
        const minSize = Math.sqrt(requirements.area * 100); // Convert to pixels (roughly)
        
        return {
            id: Date.now() + Math.random(),
            type: type,
            x: x,
            y: y,
            width: Math.max(minSize, 60),
            height: Math.max(minSize * 0.6, 40),
            requirements: requirements,
            connected: false
        };
    }

    getModuleAt(x, y) {
        return this.modules.find(module => 
            x >= module.x && x <= module.x + module.width &&
            y >= module.y && y <= module.y + module.height
        );
    }

    isWithinBaseOutline(x, y) {
        return x >= this.baseOutline.x && x <= this.baseOutline.x + this.baseOutline.width &&
               y >= this.baseOutline.y && y <= this.baseOutline.y + this.baseOutline.height;
    }

    constrainModuleToBase(module) {
        module.x = Math.max(this.baseOutline.x, 
            Math.min(module.x, this.baseOutline.x + this.baseOutline.width - module.width));
        module.y = Math.max(this.baseOutline.y, 
            Math.min(module.y, this.baseOutline.y + this.baseOutline.height - module.height));
    }

    updateEnvironment() {
        const env = this.environments[this.environment];
        document.body.style.background = `linear-gradient(135deg, ${env.background} 0%, #1a1a2e 50%, #16213e 100%)`;
        
        // Update base outline constraints
        const maxPixels = Math.min(this.canvas.width - 100, this.canvas.height - 100);
        const scale = maxPixels / (env.maxWidth * 10); // Rough conversion
        this.baseOutline.width = Math.min(400, env.maxWidth * scale);
        this.baseOutline.height = Math.min(300, env.maxHeight * scale);
        
        this.updateResourceDisplay();
        this.draw();
    }

    updateResourceDisplay() {
        const totalRequirements = this.calculateTotalRequirements();
        const warnings = [];

        // Calculate resource status
        const resources = {
            food: this.calculateResourceStatus('kitchen', totalRequirements.food),
            water: this.calculateResourceStatus('hygiene', totalRequirements.water),
            oxygen: this.calculateResourceStatus('storage', totalRequirements.oxygen),
            exercise: this.calculateResourceStatus('gym', totalRequirements.exercise),
            radiation: this.calculateRadiationStatus()
        };

        // Update resource bars and status
        Object.keys(resources).forEach(resource => {
            const status = resources[resource];
            const bar = document.getElementById(`${resource}-bar`);
            const statusElement = document.getElementById(`${resource}-status`);
            
            if (bar && statusElement) {
                bar.style.width = `${Math.min(100, Math.max(0, status.percentage))}%`;
                statusElement.textContent = status.text;
                statusElement.className = `resource-status ${status.class}`;
                
                if (status.warning) {
                    warnings.push(status.warning);
                }
            }
        });

        // Update base stats
        document.getElementById('total-area').textContent = `${totalRequirements.totalArea.toFixed(1)} m²`;
        document.getElementById('module-count').textContent = this.modules.length;
        
        const connected = this.checkConnectivity();
        document.getElementById('connected-status').textContent = connected ? '✅' : '❌';
        
        if (!connected) {
            warnings.push('Some modules are not connected to the main base');
        }

        // Route warnings
        if (this.useAIWarnings) {
            this.renderAIContentFromWarnings(warnings);
        } else {
            this.updateWarnings(warnings);
        }

        // Update module status indicators
        this.updateModuleStatuses();
    }

    calculateTotalRequirements() {
        const totalArea = this.modules.reduce((sum, module) => {
            return sum + (module.width * module.height / 100); // Rough conversion to m²
        }, 0);

        return {
            totalArea,
            food: this.crewCount * this.dailyConsumption.food * this.missionDuration,
            water: this.crewCount * this.dailyConsumption.water * this.missionDuration,
            oxygen: this.crewCount * this.dailyConsumption.oxygen * this.missionDuration,
            exercise: this.crewCount * this.dailyConsumption.exercise * this.missionDuration
        };
    }

    calculateResourceStatus(moduleType, required) {
        const modules = this.modules.filter(m => m.type === moduleType);
        const totalCapacity = modules.reduce((sum, module) => {
            return sum + (module.width * module.height / 100) * 10; // Rough capacity calculation
        }, 0);

        const percentage = (totalCapacity / required) * 100;
        
        if (percentage < 50) {
            return {
                percentage,
                text: 'Critical',
                class: 'critical',
                warning: `${moduleType} capacity insufficient for crew needs`
            };
        } else if (percentage < 80) {
            return {
                percentage,
                text: 'Low',
                class: 'low',
                warning: `${moduleType} capacity may be insufficient`
            };
        } else if (percentage > 150) {
            return {
                percentage,
                text: 'Oversized',
                class: 'oversized'
            };
        } else {
            return {
                percentage,
                text: 'OK',
                class: 'ok'
            };
        }
    }

    calculateRadiationStatus() {
        const env = this.environments[this.environment];
        const storageModules = this.modules.filter(m => m.type === 'storage');
        const shieldingCapacity = storageModules.length * 2; // Rough calculation
        
        if (env.radiation === 'extreme' && shieldingCapacity < this.crewCount) {
            return {
                percentage: 30,
                text: 'Critical',
                class: 'critical',
                warning: 'Insufficient radiation shielding for orbit environment'
            };
        } else if (env.radiation === 'high' && shieldingCapacity < this.crewCount * 0.5) {
            return {
                percentage: 60,
                text: 'Low',
                class: 'low',
                warning: 'Consider adding more radiation shielding'
            };
        } else {
            return {
                percentage: 100,
                text: 'OK',
                class: 'ok'
            };
        }
    }

    startCorridorMode(x, y) {
        this.corridorMode = true;
        this.corridorStart = { x, y };
        this.canvas.style.cursor = 'crosshair';
    }

    createCorridor(start, end) {
        const corridor = {
            id: Date.now() + Math.random(),
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
            start: start,
            end: end
        };
        
        // Ensure minimum corridor width
        if (corridor.width < 20) corridor.width = 20;
        if (corridor.height < 20) corridor.height = 20;
        
        this.corridors.push(corridor);
        return corridor;
    }

    checkConnectivity() {
        if (this.modules.length === 0) return true;
        if (this.modules.length === 1) return true;
        
        // Create adjacency graph based on corridors and proximity
        const graph = {};
        this.modules.forEach(module => {
            graph[module.id] = [];
        });
        
        // Add connections based on corridors
        this.corridors.forEach(corridor => {
            const connectedModules = this.getModulesConnectedByCorridor(corridor);
            if (connectedModules.length >= 2) {
                for (let i = 0; i < connectedModules.length; i++) {
                    for (let j = i + 1; j < connectedModules.length; j++) {
                        const id1 = connectedModules[i].id;
                        const id2 = connectedModules[j].id;
                        if (!graph[id1].includes(id2)) graph[id1].push(id2);
                        if (!graph[id2].includes(id1)) graph[id2].push(id1);
                    }
                }
            }
        });
        
        // Add connections based on adjacency
        this.modules.forEach(module1 => {
            this.modules.forEach(module2 => {
                if (module1 !== module2 && this.isAdjacent(module1, module2)) {
                    if (!graph[module1.id].includes(module2.id)) {
                        graph[module1.id].push(module2.id);
                    }
                }
            });
        });
        
        // Check if all modules are reachable from the first module
        const visited = new Set();
        const queue = [this.modules[0].id];
        
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            
            visited.add(current);
            graph[current].forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            });
        }
        
        return visited.size === this.modules.length;
    }

    getModulesConnectedByCorridor(corridor) {
        return this.modules.filter(module => {
            return this.isModuleIntersectingCorridor(module, corridor);
        });
    }

    isModuleIntersectingCorridor(module, corridor) {
        // Check if module intersects with corridor
        return !(module.x + module.width < corridor.x || 
                module.x > corridor.x + corridor.width ||
                module.y + module.height < corridor.y ||
                module.y > corridor.y + corridor.height);
    }

    isAdjacent(module1, module2) {
        const threshold = 20; // pixels
        return Math.abs(module1.x - module2.x) < threshold || 
               Math.abs(module1.y - module2.y) < threshold;
    }

    updateModuleStatuses() {
        this.modules.forEach(module => {
            const requirements = this.moduleRequirements[module.type];
            const area = (module.width * module.height) / 100; // Rough m²
            const requiredArea = requirements.area * this.crewCount;
            
            if (area < requiredArea * 0.8) {
                module.status = 'too-small';
            } else if (area > requiredArea * 1.5) {
                module.status = 'oversized';
            } else {
                module.status = 'ok';
            }
        });
    }

    updateWarnings(warnings) {
        const aiContent = document.getElementById('ai-content');
        if (!aiContent) return;
        if (warnings.length === 0) {
            if (!this.useAIWarnings) aiContent.innerHTML = '<div style="opacity:.7">No warnings.</div>';
            return;
        }
        if (!this.useAIWarnings) {
            aiContent.innerHTML = warnings.map(w => `
                <div class="warning-item">${w}</div>
            `).join('');
        }
    }

    async requestAIAnalysis() {
        const aiContent = document.getElementById('ai-content');
        if (!aiContent) return;
        aiContent.innerHTML = '<div style="opacity:.7">Analyzing design with AI…</div>';

        const design = {
            environment: this.environment,
            crewCount: this.crewCount,
            missionDuration: this.missionDuration,
            modules: this.modules,
            corridors: this.corridors
        };

        try {
            const res = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen/qwen3-235b-a22b:free',
                    prompt: 'Provide concise, actionable advice.',
                    design
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            aiContent.innerHTML = this.renderMarkdownSafe(data.content || 'No response');
        } catch (err) {
            aiContent.innerHTML = `<div class="warning-item">AI Error: ${String(err.message || err)}</div>`;
        }
    }

    renderAIContentFromWarnings(warnings) {
        const aiContent = document.getElementById('ai-content');
        if (!aiContent) return;
        if (warnings.length === 0) {
            aiContent.innerHTML = '<div style="opacity:.7">No critical issues detected.</div>';
            return;
        }
        aiContent.innerHTML = warnings.map(w => `- ${w}`).join('<br>');
    }

    renderMarkdownSafe(text) {
        // Basic sanitize and convert line breaks
        const escaped = (text || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
        return escaped.replace(/\n/g, '<br>');
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background effects
        this.drawBackgroundEffects();
        
        // Draw grid
        this.drawGrid();
        
        // Draw base outline
        this.drawBaseOutline();
        
        // Draw corridors
        this.corridors.forEach(corridor => {
            this.drawCorridor(corridor);
        });
        
        // Draw corridor preview
        if (this.corridorPreview) {
            this.drawCorridorPreview(this.corridorPreview);
        }
        
        // Draw modules
        this.modules.forEach(module => {
            this.drawModule(module);
        });
        
        // Draw crew flow visualization
        this.drawCrewFlow();
    }

    drawGrid() {
        const gridSize = 20;
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawBaseOutline() {
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeRect(
            this.baseOutline.x, 
            this.baseOutline.y, 
            this.baseOutline.width, 
            this.baseOutline.height
        );
        this.ctx.setLineDash([]);
        
        // Add glow effect
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 20;
        this.ctx.strokeRect(
            this.baseOutline.x, 
            this.baseOutline.y, 
            this.baseOutline.width, 
            this.baseOutline.height
        );
        this.ctx.shadowBlur = 0;
    }

    drawModule(module) {
        const isSelected = module === this.selectedModule;
        const colors = {
            kitchen: '#ff6b6b',
            lab: '#4ecdc4',
            gym: '#45b7d1',
            sleeping: '#96ceb4',
            hygiene: '#feca57',
            storage: '#ff9ff3',
            medical: '#54a0ff',
            recreation: '#5f27cd'
        };
        
        this.ctx.fillStyle = colors[module.type] || '#ffffff';
        this.ctx.globalAlpha = isSelected ? 0.8 : 0.6;
        
        // Draw module background
        this.ctx.fillRect(module.x, module.y, module.width, module.height);
        
        // Draw border
        this.ctx.globalAlpha = 1;
        this.ctx.strokeStyle = isSelected ? '#ffff00' : 
                              module.status === 'too-small' ? '#ff4444' :
                              module.status === 'oversized' ? '#ffaa00' : '#00ffff';
        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.strokeRect(module.x, module.y, module.width, module.height);
        
        // Draw module label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            module.type.toUpperCase(), 
            module.x + module.width / 2, 
            module.y + module.height / 2
        );
        
        // Draw status indicator
        if (module.status === 'too-small') {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillRect(module.x + module.width - 15, module.y + 5, 10, 10);
        } else if (module.status === 'oversized') {
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillRect(module.x + module.width - 15, module.y + 5, 10, 10);
        }
    }

    drawBackgroundEffects() {
        const env = this.environments[this.environment];
        
        // Draw stars for space environments
        if (this.environment === 'orbit' || this.environment === 'moon') {
            this.ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * this.canvas.width;
                const y = Math.random() * this.canvas.height;
                const size = Math.random() * 2;
                this.ctx.fillRect(x, y, size, size);
            }
        }
        
        // Draw Mars dust effect
        if (this.environment === 'mars') {
            this.ctx.fillStyle = 'rgba(139, 69, 19, 0.1)';
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * this.canvas.width;
                const y = Math.random() * this.canvas.height;
                const size = Math.random() * 3;
                this.ctx.fillRect(x, y, size, size);
            }
        }
    }

    drawCorridorPreview(preview) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.globalAlpha = 0.7;
        
        const x = Math.min(preview.start.x, preview.end.x);
        const y = Math.min(preview.start.y, preview.end.y);
        const width = Math.abs(preview.end.x - preview.start.x);
        const height = Math.abs(preview.end.y - preview.start.y);
        
        this.ctx.strokeRect(x, y, Math.max(width, 20), Math.max(height, 20));
        
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1;
    }

    drawCrewFlow() {
        if (this.modules.length < 2) return;
        
        // Draw animated dots showing crew movement
        this.ctx.fillStyle = '#00ffff';
        this.ctx.globalAlpha = 0.6;
        
        const time = Date.now() * 0.001;
        this.modules.forEach((module, index) => {
            const centerX = module.x + module.width / 2;
            const centerY = module.y + module.height / 2;
            
            // Create flowing animation
            const offsetX = Math.sin(time + index) * 10;
            const offsetY = Math.cos(time + index) * 10;
            
            this.ctx.beginPath();
            this.ctx.arc(centerX + offsetX, centerY + offsetY, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1;
    }

    drawCorridor(corridor) {
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 4;
        this.ctx.globalAlpha = 0.7;
        this.ctx.strokeRect(corridor.x, corridor.y, corridor.width, corridor.height);
        
        // Add glow effect
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeRect(corridor.x, corridor.y, corridor.width, corridor.height);
        this.ctx.shadowBlur = 0;
        
        this.ctx.globalAlpha = 1;
    }

    saveDesign() {
        const design = {
            environment: this.environment,
            crewCount: this.crewCount,
            missionDuration: this.missionDuration,
            modules: this.modules,
            corridors: this.corridors,
            timestamp: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(design, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `space-base-design-${Date.now()}.json`;
        link.click();
    }

    loadDesign() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const design = JSON.parse(e.target.result);
                    this.loadDesignData(design);
                } catch (error) {
                    alert('Error loading design file: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    loadDesignData(design) {
        this.environment = design.environment;
        this.crewCount = design.crewCount;
        this.missionDuration = design.missionDuration;
        this.modules = design.modules || [];
        this.corridors = design.corridors || [];
        
        // Update UI
        document.getElementById('environment').value = this.environment;
        document.getElementById('crew-count').value = this.crewCount;
        document.getElementById('duration').value = this.missionDuration;
        
        this.updateEnvironment();
        this.updateResourceDisplay();
        this.draw();
    }

    loadScenario(scenarioId) {
        const scenarios = {
            'lunar-research': {
                environment: 'moon',
                crewCount: 4,
                missionDuration: 30,
                description: 'Lunar Research Mission'
            },
            'mars-colony': {
                environment: 'mars',
                crewCount: 6,
                missionDuration: 90,
                description: 'Mars Colony Mission'
            },
            'orbital-lab': {
                environment: 'orbit',
                crewCount: 8,
                missionDuration: 180,
                description: 'Orbital Laboratory Mission'
            }
        };

        if (scenarioId === 'custom') return;

        const scenario = scenarios[scenarioId];
        if (!scenario) return;

        this.environment = scenario.environment;
        this.crewCount = scenario.crewCount;
        this.missionDuration = scenario.missionDuration;

        // Update UI
        document.getElementById('environment').value = this.environment;
        document.getElementById('crew-count').value = this.crewCount;
        document.getElementById('duration').value = this.missionDuration;

        this.updateEnvironment();
        this.updateResourceDisplay();
        this.draw();
    }

    exportImage() {
        // Create a temporary canvas for export
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        
        // Draw background
        exportCtx.fillStyle = '#0c0c0c';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw all game elements
        this.drawBackgroundEffects.call({ ctx: exportCtx, canvas: exportCanvas, environment: this.environment });
        this.drawGrid.call({ ctx: exportCtx, canvas: exportCanvas });
        this.drawBaseOutline.call({ ctx: exportCtx, baseOutline: this.baseOutline });
        
        // Draw corridors
        this.corridors.forEach(corridor => {
            this.drawCorridor.call({ ctx: exportCtx }, corridor);
        });
        
        // Draw modules
        this.modules.forEach(module => {
            this.drawModule.call({ ctx: exportCtx, selectedModule: this.selectedModule, moduleRequirements: this.moduleRequirements }, module);
        });
        
        // Export as image
        const link = document.createElement('a');
        link.download = `space-base-design-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL();
        link.click();
    }

    clearBase() {
        if (confirm('Are you sure you want to clear the entire base?')) {
            this.modules = [];
            this.corridors = [];
            this.selectedModule = null;
            this.updateResourceDisplay();
            this.draw();
        }
    }

    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SpaceBaseGame();
});
