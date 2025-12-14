// HisMarketing Landing Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add scroll animation for feature boxes
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all feature boxes
    document.querySelectorAll('.feature-box').forEach(box => {
        box.style.opacity = '0';
        box.style.transform = 'translateY(30px)';
        box.style.transition = 'all 0.6s ease';
        observer.observe(box);
    });
    
    // Add hover effect to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Parallax effect for hero background
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.hero-background');
        
        if (parallax) {
            parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
    
    // Animate stats on scroll
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statValues = entry.target.querySelectorAll('.stat-value');
                statValues.forEach(stat => {
                    const text = stat.textContent.trim();
                    // NaN kontrolü
                    if (text.includes('NaN') || text === 'NaN%') {
                        stat.textContent = '92%'; // Default value
                    }
                    
                    if (text.includes('K+')) {
                        animateValue(stat, 0, 50, 2000, 'K+');
                    } else if (text.includes('%')) {
                        const value = parseInt(text);
                        if (!isNaN(value)) {
                            animateValue(stat, 0, value, 2000, '%');
                        }
                    }
                });
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        statsObserver.observe(statsGrid);
    }
    
    // Animate number function
    function animateValue(element, start, end, duration, suffix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
    
    // Add floating animation to feature card
    const featureCard = document.querySelector('.feature-card');
    if (featureCard) {
        let floatDirection = 1;
        let floatPosition = 0;
        
        setInterval(() => {
            floatPosition += 0.5 * floatDirection;
            if (floatPosition >= 10 || floatPosition <= -10) {
                floatDirection *= -1;
            }
            featureCard.style.transform = `translateY(${floatPosition}px)`;
        }, 50);
    }
    
    // Add ripple effect to buttons
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Lazy load animations
    const lazyElements = document.querySelectorAll('.hero-left, .hero-right, .section-header');
    const lazyObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                lazyObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    lazyElements.forEach(element => {
        lazyObserver.observe(element);
    });
});

// Add CSS for ripple effect dynamically
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
