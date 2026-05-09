/**
 * PawDesk Waitlist Form Handler
 * Submits email + business_type + current_tool to /api/waitlist (CF Pages Function)
 */
(function () {
  'use strict';

  const form = document.getElementById('waitlist-form');
  const successEl = document.getElementById('form-success');
  const errorEl = document.getElementById('form-error');

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const businessTypeInput = document.getElementById('business_type');
    const currentToolInput = document.getElementById('current_tool');
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = emailInput ? emailInput.value.trim() : '';
    const businessType = businessTypeInput ? businessTypeInput.value : '';
    const currentTool = currentToolInput ? currentToolInput.value.trim() : '';

    // Client-side validation
    if (!email || !isValidEmail(email)) {
      showError('Please enter a valid email address.');
      emailInput && emailInput.focus();
      return;
    }

    if (!businessType) {
      showError('Please select your business type so we can tailor your early access.');
      businessTypeInput && businessTypeInput.focus();
      return;
    }

    // Reset state
    hideError();
    hideSuccess();
    setLoading(submitBtn, true);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, business_type: businessType, current_tool: currentTool }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok !== false) {
        showSuccess();
        form.style.display = 'none';
      } else {
        const msg = data.error || 'Something went wrong. Please try again in a moment.';
        showError(msg);
        setLoading(submitBtn, false);
      }
    } catch (err) {
      showError('Could not reach the server. Please check your connection and try again.');
      setLoading(submitBtn, false);
    }
  });

  function isValidEmail(email) {
    // RFC 5322 simplified check
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function showSuccess() {
    if (successEl) {
      successEl.style.display = 'block';
    }
  }

  function hideSuccess() {
    if (successEl) successEl.style.display = 'none';
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  function hideError() {
    if (errorEl) errorEl.style.display = 'none';
  }

  function setLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.textContent = 'Joining…';
      btn.classList.add('loading');
    } else {
      btn.disabled = false;
      btn.textContent = 'Join waitlist — it\'s free';
      btn.classList.remove('loading');
    }
  }

  // Fade-in observer for sections
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(function (el) {
      observer.observe(el);
    });
  }
})();
