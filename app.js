// Application data
const appData = {
  product: {
    name: "TuneCraft",
    originalPrice: 269
,
    currency: "₹"
  },
  wheelSegments: [
    {value: 5, label: "₹5 OFF", color: "#FF6B6B", weight: 25},
    {value: 10, label: "₹10 OFF", color: "#4ECDC4", weight: 25},
    {value: 25, label: "₹25 OFF", color: "#45B7D1", weight: 20},
    {value: 30, label: "₹30 OFF", color: "#96CEB4", weight: 15},
    {value: 40, label: "₹40 OFF", color: "#FFEAA7", weight: 10},
    {value: 50, label: "₹50 OFF", color: "#DDA0DD", weight: 5},
    {value: 100, label: "₹100 OFF", color: "#FFB347", weight: 0} // Never selected
  ],
  payment: {
    upiId: "9167514590@yescred",
    merchantName: "TuneCrafters"
  }
};

// Global variables
let hasSpun = false;
let selectedDiscount = 0;
let transactionId = '';

// Utility functions
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
}

function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TC-${timestamp}-${random}`;
}

function playClickSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Audio context not available');
  }
}

// Weighted random selection for wheel segments
function getRandomSegment() {
  const segments = appData.wheelSegments.filter(segment => segment.weight > 0);
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const segment of segments) {
    random -= segment.weight;
    if (random <= 0) {
      return segment;
    }
  }
  
  // Fallback to first valid segment
  return segments[0];
}

// Calculate rotation for winning segment
function calculateWinningRotation(targetValue) {
  const segmentAngle = 360 / 7; // 7 segments
  const segments = [5, 10, 25, 30, 40, 50, 100];
  const targetIndex = segments.indexOf(targetValue);
  
  if (targetIndex === -1) return 0;
  
  // Calculate the center angle of the target segment
  const centerAngle = targetIndex * segmentAngle + (segmentAngle / 2);
  
  // Add multiple full rotations for visual effect
  const fullRotations = 5 + Math.random() * 3; // 5-8 full rotations
  const totalRotation = (fullRotations * 360) + (360 - centerAngle);
  
  return totalRotation;
}

// Create confetti effect
function createConfetti() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.top = '-10px';
    confetti.style.zIndex = '1000';
    confetti.style.borderRadius = '50%';
    confetti.style.pointerEvents = 'none';
    
    document.body.appendChild(confetti);
    
    // Animate confetti falling
    const fallDuration = 3000 + Math.random() * 2000;
    const horizontalMovement = (Math.random() - 0.5) * 200;
    
    confetti.animate([
      {
        transform: 'translateY(0px) translateX(0px) rotate(0deg)',
        opacity: 1
      },
      {
        transform: `translateY(${window.innerHeight + 100}px) translateX(${horizontalMovement}px) rotate(360deg)`,
        opacity: 0
      }
    ], {
      duration: fallDuration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }).onfinish = () => {
      if (document.body.contains(confetti)) {
        document.body.removeChild(confetti);
      }
    };
  }
}

// Show discount result
function showDiscountResult() {
  const discountResult = document.getElementById('discountResult');
  if (discountResult) {
    discountResult.classList.remove('hidden');
    const discountAmount = discountResult.querySelector('.discount-amount');
    if (discountAmount) {
      discountAmount.textContent = `You won ₹${selectedDiscount} OFF!`;
    }
    
    // Add celebration effect
    createConfetti();
    
    // Show payment form after a delay
    setTimeout(() => {
      showPaymentForm();
    }, 2000);
  }
}

// Show payment form
function showPaymentForm() {
  const paymentForm = document.getElementById('paymentForm');
  if (paymentForm) {
    paymentForm.classList.remove('hidden');
    
    // Update price summary
    const finalPrice = appData.product.originalPrice - selectedDiscount;
    const discountValueEl = document.getElementById('discountValue');
    const finalPriceEl = document.getElementById('finalPrice');
    
    if (discountValueEl) discountValueEl.textContent = selectedDiscount;
    if (finalPriceEl) finalPriceEl.textContent = finalPrice;
    
    // Scroll to payment form
    paymentForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Spin wheel function
function spinWheel() {
  if (hasSpun) return;
  
  const spinBtn = document.getElementById('spinBtn');
  const wheel = document.getElementById('wheel');
  
  if (!spinBtn || !wheel) return;
  
  hasSpun = true;
  spinBtn.disabled = true;
  spinBtn.textContent = 'Spinning...';
  
  // Play click sound
  playClickSound();
  
  // Get winning segment (exclude ₹100)
  const winningSegment = getRandomSegment();
  selectedDiscount = winningSegment.value;
  
  // Calculate rotation
  const rotation = calculateWinningRotation(selectedDiscount);
  
  // Apply rotation
  wheel.style.transform = `rotate(${rotation}deg)`;
  
  // Show result after animation
  setTimeout(() => {
    showDiscountResult();
  }, 4500);
}

// Generate a random 4-digit unique ID (string) for checkout
function generateShortId() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Handle form submission
async function handleFormSubmission(event) {
  event.preventDefault();
  
  const userName = document.getElementById('userName');
  const userContact = document.getElementById('userContact');
  
  if (!userName || !userContact) return;
  
  const nameValue = userName.value.trim();
  const contactValue = userContact.value.trim();
  
  // Validate inputs
  if (!nameValue) {
    alert('Please enter your full name');
    return;
  }
  
  if (!contactValue) {
    alert('Please enter your phone number or email');
    return;
  }
  
  // Validate email or phone
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[6-9]\d{9}$/;
  
  if (!emailRegex.test(contactValue) && !phoneRegex.test(contactValue)) {
    alert('Please enter a valid email address or 10-digit phone number');
    return;
  }
  
  // Generate short transaction ID
  transactionId = 'TC-' + generateShortId();
  const finalAmount = appData.product.originalPrice - selectedDiscount;
  
  // Show payment success with the short ID
  showPaymentSuccess(finalAmount);
}

// Show payment success with UPI link
function showPaymentSuccess(finalAmount) {
  const paymentForm = document.getElementById('paymentForm');
  const paymentSuccess = document.getElementById('paymentSuccess');
  
  if (paymentForm) paymentForm.classList.add('hidden');
  if (paymentSuccess) {
    paymentSuccess.classList.remove('hidden');
    
    // Update transaction details
    const transactionIdEl = document.getElementById('transactionId');
    const paymentAmountEl = document.getElementById('paymentAmount');
    const upiLinkEl = document.getElementById('upiLink');
    
    if (transactionIdEl) transactionIdEl.textContent = transactionId;
    if (paymentAmountEl) paymentAmountEl.textContent = finalAmount;
    
    // Create UPI link
    if (upiLinkEl) {
      const upiLink = `upi://pay?pa=${appData.payment.upiId}&pn=${appData.payment.merchantName}&am=${finalAmount}&cu=INR&tn=${transactionId}`;
      upiLinkEl.href = upiLink;
    }
    
    // Scroll to payment success
    paymentSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Initialize animations on page load
function initializeAnimations() {
  // Animate visualizer bars
  const bars = document.querySelectorAll('.bar');
  bars.forEach((bar, index) => {
    bar.style.animationDelay = `${index * 0.1}s`;
  });
  
  // Animate lyrics
  const lyrics = document.querySelectorAll('.lyric-line');
  if (lyrics.length > 0) {
    let currentLyric = 0;
    
    setInterval(() => {
      lyrics.forEach(lyric => lyric.classList.remove('active'));
      lyrics[currentLyric].classList.add('active');
      currentLyric = (currentLyric + 1) % lyrics.length;
    }, 3000);
  }
  
  // Add scroll reveal animation
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observe feature cards
  document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
}

// Initialize hover effects
function initializeHoverEffects() {
  // Add hover effects to buttons
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (!btn.disabled) {
        btn.style.transform = 'translateY(-2px)';
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (!btn.disabled) {
        btn.style.transform = 'translateY(0)';
      }
    });
  });
  
  // Add hover effects to feature cards
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// Initialize particle animation in hero section
function initializeParticles() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;
  
  const particleCount = 30; // Reduced for performance
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
      position: absolute;
      width: 2px;
      height: 2px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: float ${3 + Math.random() * 4}s ease-in-out infinite;
      animation-delay: ${Math.random() * 4}s;
    `;
    
    hero.appendChild(particle);
  }
}

// Add smooth scrolling for navigation
function initializeSmoothScrolling() {
  // Make the Buy Now button scroll to spin section
  const ctaButton = document.querySelector('.cta-button');
  if (ctaButton) {
    ctaButton.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToSection('spin-section');
    });
  }
}

// Handle form validation in real-time
function initializeFormValidation() {
  const nameInput = document.getElementById('userName');
  const contactInput = document.getElementById('userContact');
  
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim().length < 2) {
        nameInput.style.borderColor = '#ff6b6b';
      } else {
        nameInput.style.borderColor = 'var(--color-border)';
      }
    });
  }
  
  if (contactInput) {
    contactInput.addEventListener('input', () => {
      const value = contactInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[6-9]\d{9}$/;
      
      if (emailRegex.test(value) || phoneRegex.test(value)) {
        contactInput.style.borderColor = '#4ecdc4';
      } else {
        contactInput.style.borderColor = '#ff6b6b';
      }
    });
  }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add event listeners
  const spinBtn = document.getElementById('spinBtn');
  const userForm = document.getElementById('userForm');
  
  if (spinBtn) {
    spinBtn.addEventListener('click', spinWheel);
  }
  
  if (userForm) {
    userForm.addEventListener('submit', handleFormSubmission);
  }
  
  // Initialize features
  initializeAnimations();
  initializeHoverEffects();
  initializeSmoothScrolling();
  initializeFormValidation();
  
  // Add some delay before initializing particles to avoid performance issues
  setTimeout(initializeParticles, 1000);
  
  // Add click sound to interactive elements
  document.querySelectorAll('.btn, .control-btn, .play-button').forEach(element => {
    element.addEventListener('click', () => {
      playClickSound();
    });
  });
  
  // Add pulse animation to CTA button
  const ctaButton = document.querySelector('.cta-button');
  if (ctaButton) {
    setInterval(() => {
      ctaButton.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.5)';
      setTimeout(() => {
        ctaButton.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
      }, 1000);
    }, 3000);
  }
  
  console.log('TuneCraft application initialized successfully!');
});

// Initialize responsive wheel on load
window.addEventListener('load', () => {
  const wheel = document.getElementById('wheel');
  if (!wheel) return;
  
  // Set initial size
  if (window.innerWidth < 480) {
    wheel.style.width = '200px';
    wheel.style.height = '200px';
  } else if (window.innerWidth < 768) {
    wheel.style.width = '250px';
    wheel.style.height = '250px';
  } else {
    wheel.style.width = '300px';
    wheel.style.height = '300px';
  }
});

// Expose global functions for HTML onclick handlers
window.scrollToSection = scrollToSection;