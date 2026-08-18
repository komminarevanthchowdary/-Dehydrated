/* ============================================
   RENEPLANE MORINGA — CINEMATIC ANIMATION ENGINE
   ============================================ */

(function () {
    'use strict';

    // ─── Loader ───
    const loader = document.getElementById('loader');
    const loaderProgress = document.getElementById('loaderProgress');
    let loadPercent = 0;

    const loaderInterval = setInterval(() => {
        loadPercent += Math.random() * 15 + 5;
        if (loadPercent >= 100) {
            loadPercent = 100;
            loaderProgress.style.width = '100%';
            clearInterval(loaderInterval);
            setTimeout(() => {
                loader.classList.add('hidden');
                initAnimations();
            }, 400);
        } else {
            loaderProgress.style.width = loadPercent + '%';
        }
    }, 200);

    // ─── Scroll Progress Bar ───
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.prepend(progressBar);

    // ─── Navigation Scroll ───
    const cinNav = document.getElementById('cinNav');
    let lastScrollY = 0;

    function handleNavScroll() {
        const scrollY = window.scrollY;
        if (scrollY > 60) {
            cinNav.classList.add('scrolled');
        } else {
            cinNav.classList.remove('scrolled');
        }

        // Progress bar
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollY / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';

        // Hide scroll indicator
        const scrollIndicator = document.getElementById('scrollIndicator');
        if (scrollIndicator && scrollY > 100) {
            scrollIndicator.style.opacity = Math.max(0, 1 - scrollY / 300);
        }

        lastScrollY = scrollY;
    }

    // Active nav link tracking
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const links = document.querySelectorAll('.cin-nav-link');
        let current = '';

        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 200 && rect.bottom > 200) {
                current = section.getAttribute('id');
            }
        });

        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }

    // ─── Reveal on Scroll ───
    function initRevealAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.reveal-el').forEach(el => observer.observe(el));
    }

    // ─── Particle System ───
    class ParticleSystem {
        constructor(canvasId, options = {}) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.options = {
                count: options.count || 40,
                color: options.color || 'rgba(22, 163, 74, 0.15)',
                minSize: options.minSize || 2,
                maxSize: options.maxSize || 6,
                speed: options.speed || 0.3,
                type: options.type || 'circle', // 'circle', 'leaf', 'powder'
                ...options
            };
            this.resizeCanvas();
            this.createParticles();
            this.animate();
            window.addEventListener('resize', () => this.resizeCanvas());
        }

        resizeCanvas() {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }

        createParticles() {
            this.particles = [];
            for (let i = 0; i < this.options.count; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * (this.options.maxSize - this.options.minSize) + this.options.minSize,
                    speedX: (Math.random() - 0.5) * this.options.speed,
                    speedY: (Math.random() - 0.5) * this.options.speed - 0.1,
                    opacity: Math.random() * 0.5 + 0.1,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        drawParticle(p) {
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);

            if (this.options.type === 'leaf') {
                // Leaf shape
                this.ctx.fillStyle = `rgba(22, 163, 74, ${p.opacity * 0.6})`;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Leaf vein
                this.ctx.strokeStyle = `rgba(22, 163, 74, ${p.opacity * 0.3})`;
                this.ctx.lineWidth = 0.5;
                this.ctx.beginPath();
                this.ctx.moveTo(-p.size * 2, 0);
                this.ctx.lineTo(p.size * 2, 0);
                this.ctx.stroke();
            } else if (this.options.type === 'powder') {
                // Powder particle
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                gradient.addColorStop(0, `rgba(100, 180, 80, ${p.opacity})`);
                gradient.addColorStop(1, `rgba(22, 163, 74, 0)`);
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Default circle
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                gradient.addColorStop(0, this.options.color);
                gradient.addColorStop(1, 'rgba(22, 163, 74, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        animate() {
            if (!this.canvas || !this.ctx) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.particles.forEach(p => {
                // Sinusoidal float
                p.x += p.speedX + Math.sin(p.phase + performance.now() * 0.001) * 0.15;
                p.y += p.speedY;
                p.rotation += p.rotationSpeed;
                p.opacity = 0.1 + Math.abs(Math.sin(p.phase + performance.now() * 0.0005)) * 0.4;

                // Wrap around
                if (p.x < -10) p.x = this.canvas.width + 10;
                if (p.x > this.canvas.width + 10) p.x = -10;
                if (p.y < -10) p.y = this.canvas.height + 10;
                if (p.y > this.canvas.height + 10) p.y = -10;

                this.drawParticle(p);
            });

            requestAnimationFrame(() => this.animate());
        }
    }

    // ─── 360° Product Rotation ───
    function init360Rotation() {
        const rotateProduct = document.getElementById('rotateProduct');
        if (!rotateProduct) return;

        let isDragging = false;
        let startX = 0;
        let currentRotation = 0;
        let autoRotationAngle = 0;
        let autoRotating = true;

        function autoRotate() {
            if (!autoRotating) return;
            autoRotationAngle += 0.15;
            const scaleX = Math.cos(autoRotationAngle * Math.PI / 180);
            rotateProduct.style.transform = `scaleX(${Math.abs(scaleX) < 0.1 ? 0.1 : scaleX}) perspective(800px) rotateY(${Math.sin(autoRotationAngle * Math.PI / 180) * 8}deg)`;
            requestAnimationFrame(autoRotate);
        }

        // Scroll-triggered rotation
        const rotateSection = document.getElementById('rotate360');
        const rotateObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    autoRotating = true;
                    autoRotate();
                } else {
                    autoRotating = false;
                }
            });
        }, { threshold: 0.2 });
        rotateObserver.observe(rotateSection);

        // Drag rotation
        rotateProduct.addEventListener('mousedown', (e) => {
            isDragging = true;
            autoRotating = false;
            startX = e.clientX;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            currentRotation += deltaX * 0.5;
            startX = e.clientX;
            const scaleX = Math.cos(currentRotation * Math.PI / 180);
            rotateProduct.style.transform = `scaleX(${Math.abs(scaleX) < 0.1 ? 0.1 : scaleX}) perspective(800px) rotateY(${Math.sin(currentRotation * Math.PI / 180) * 12}deg)`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                autoRotationAngle = currentRotation;
                autoRotating = true;
                autoRotate();
            }
        });

        // Touch events
        rotateProduct.addEventListener('touchstart', (e) => {
            isDragging = true;
            autoRotating = false;
            startX = e.touches[0].clientX;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - startX;
            currentRotation += deltaX * 0.5;
            startX = e.touches[0].clientX;
            const scaleX = Math.cos(currentRotation * Math.PI / 180);
            rotateProduct.style.transform = `scaleX(${Math.abs(scaleX) < 0.1 ? 0.1 : scaleX}) perspective(800px) rotateY(${Math.sin(currentRotation * Math.PI / 180) * 12}deg)`;
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                autoRotationAngle = currentRotation;
                autoRotating = true;
                autoRotate();
            }
        });
    }

    // ─── Macro Section Scroll Reveal ───
    function initMacroReveal() {
        const macroSection = document.getElementById('macro');
        const macroLeaves = document.getElementById('macroLeaves');
        const macroPowder = document.getElementById('macroPowder');
        const macroSpoon = document.getElementById('macroSpoon');
        const macroProduct = document.getElementById('macroProduct');

        if (!macroSection) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (macroLeaves) macroLeaves.classList.add('visible');
                    if (macroPowder) macroPowder.classList.add('visible');
                    if (macroSpoon) macroSpoon.classList.add('visible');
                }
            });
        }, { threshold: 0.3 });

        observer.observe(macroSection);

        // Parallax on macro product
        window.addEventListener('scroll', () => {
            if (!macroProduct) return;
            const rect = macroSection.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const progress = 1 - (rect.top / window.innerHeight);
                const translateY = progress * -20;
                const scale = 1 + progress * 0.05;
                macroProduct.querySelector('.macro-product-img').style.transform =
                    `translateY(${translateY}px) scale(${scale})`;
            }
        });
    }

    // ─── Hero Product Floating (after entrance) ───
    function initProductFloat() {
        const mainProduct = document.getElementById('mainProduct');
        if (!mainProduct) return;

        // Wait for entrance animation
        setTimeout(() => {
            mainProduct.classList.add('floating');
        }, 2000);
    }

    // ─── Scroll-driven Product Movement ───
    function initScrollDrivenEffects() {
        const heroProduct = document.getElementById('heroProduct');
        if (!heroProduct) return;

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const maxScroll = window.innerHeight;

            if (scrollY < maxScroll) {
                const progress = scrollY / maxScroll;
                const translateY = progress * -40;
                const scale = 1 - progress * 0.1;
                const opacity = 1 - progress * 0.5;
                heroProduct.style.transform = `translateY(${translateY}px) scale(${scale})`;
                heroProduct.style.opacity = opacity;
            }
        });

        // Final section parallax
        const finalProduct = document.getElementById('finalProduct');
        const finalStage = document.getElementById('finalStage');
        if (!finalStage) return;

        window.addEventListener('scroll', () => {
            const rect = finalStage.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const progress = 1 - (rect.top / window.innerHeight);
                const translateY = (1 - progress) * 30;
                if (finalProduct) {
                    finalProduct.style.transform = `translateY(${translateY}px)`;
                }
            }
        });
    }

    // ─── Benefit Counter Animation ───
    function initCounterAnimations() {
        const statNums = document.querySelectorAll('.stat-num');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const text = el.textContent;
                    const match = text.match(/(\d+)/);
                    if (match) {
                        const target = parseInt(match[1]);
                        const suffix = text.replace(match[1], '');
                        let current = 0;
                        const step = Math.max(1, Math.floor(target / 40));
                        const interval = setInterval(() => {
                            current += step;
                            if (current >= target) {
                                current = target;
                                clearInterval(interval);
                            }
                            el.textContent = current + suffix;
                        }, 30);
                    }
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        statNums.forEach(el => observer.observe(el));
    }

    // ─── Smooth Scroll ───
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ─── Mouse Parallax on Hero ───
    function initMouseParallax() {
        const heroSection = document.getElementById('hero');
        const productStage = document.querySelector('.product-stage');
        if (!heroSection || !productStage) return;

        heroSection.addEventListener('mousemove', (e) => {
            const rect = heroSection.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const moveX = (e.clientX - rect.left - centerX) / centerX;
            const moveY = (e.clientY - rect.top - centerY) / centerY;

            // Subtle tilt on product
            const mainProduct = document.getElementById('mainProduct');
            if (mainProduct && mainProduct.classList.contains('floating')) {
                mainProduct.style.transform = `translateY(${-16 * Math.sin(performance.now() / 1000)}px) rotateY(${moveX * 5}deg) rotateX(${-moveY * 3}deg)`;
            }

            // Move floating leaves
            document.querySelectorAll('.floating-leaf').forEach((leaf, i) => {
                const factor = (i + 1) * 3;
                leaf.style.transform += ` translate(${moveX * factor}px, ${moveY * factor}px)`;
            });
        });
    }

    // ─── Initialize All ───
    function initAnimations() {
        // Particle systems
        new ParticleSystem('heroParticles', {
            count: 30,
            type: 'leaf',
            minSize: 3,
            maxSize: 8,
            speed: 0.2,
        });

        new ParticleSystem('powderParticles', {
            count: 50,
            type: 'powder',
            minSize: 2,
            maxSize: 5,
            speed: 0.15,
            color: 'rgba(100, 180, 80, 0.2)',
        });

        new ParticleSystem('botanicalCanvas', {
            count: 25,
            type: 'leaf',
            minSize: 4,
            maxSize: 10,
            speed: 0.1,
        });

        new ParticleSystem('finalParticles', {
            count: 35,
            type: 'circle',
            minSize: 2,
            maxSize: 6,
            speed: 0.1,
            color: 'rgba(22, 163, 74, 0.12)',
        });

        // Core systems
        initRevealAnimations();
        init360Rotation();
        initMacroReveal();
        initProductFloat();
        initScrollDrivenEffects();
        initCounterAnimations();
        initSmoothScroll();
        initMouseParallax();
    }

    // ─── Scroll Event Listener ───
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleNavScroll();
                updateActiveNavLink();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

})();
