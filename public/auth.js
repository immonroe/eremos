document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabLinks = document.querySelectorAll('.tab-link');

    // Active tabs
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');

    // If there's an active tab parameter, activate that tab
    if (activeTab) {
        setActiveTab(activeTab);
    }
  
    function setActiveTab(tabId) {
      // Deactivate all tabs from URL param
      tabBtns.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Activate the selected tab
      document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }
  
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        setActiveTab(tabId);
      });
    });
  
    tabLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const tabId = this.getAttribute('data-tab');
        setActiveTab(tabId);
      });
    });
  
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    
    // Check for saved theme preference or use device preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  
    themeToggle.addEventListener('click', function() {
      document.documentElement.classList.toggle('dark');
      
      // Save theme preference
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  
    // Form validation for signup
    const signupForm = document.querySelector('#signup form');
    if (signupForm) {
      signupForm.addEventListener('submit', function(e) {
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
          e.preventDefault();
          alert('Passwords do not match!');
        }
      });
    }
  });