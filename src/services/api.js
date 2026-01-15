/**
 * PhishGuard API Service
 * Connects frontend to the FastAPI backend
 */

// API base URL - change this to your RunPod URL when deployed
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Detect phishing in an email (hardened detector)
 */
export async function detectPhishing(email) {
  const response = await fetch(`${API_BASE}/api/v1/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email)
  });

  if (!response.ok) {
    throw new Error(`Detection failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Detect phishing using baseline detector (no hardening)
 */
export async function detectBaseline(email) {
  const response = await fetch(`${API_BASE}/api/v1/detect/baseline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email)
  });

  if (!response.ok) {
    throw new Error(`Baseline detection failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate adversarial version of an email
 */
export async function generateAdversarial(email, attackTypes = ['homoglyph', 'synonym']) {
  const response = await fetch(`${API_BASE}/api/v1/generate-adversarial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      attack_types: attackTypes,
      intensity: 'medium'
    })
  });

  if (!response.ok) {
    throw new Error(`Attack generation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check API health
 */
export async function checkHealth() {
  try {
    console.log('Checking API at:', API_BASE);
    const response = await fetch(`${API_BASE}/health`);
    console.log('API response:', response.ok);
    return response.ok;
  } catch (err) {
    console.log('API check failed:', err.message);
    return false;
  }
}

/**
 * Run full demo flow:
 * 1. Detect original email (baseline)
 * 2. Generate adversarial variant
 * 3. Detect adversarial with baseline (should fail)
 * 4. Detect adversarial with hardened (should catch)
 */
export async function runFullDemo(email) {
  const results = {
    step1: null, // Original detection
    step2: null, // Adversarial generation
    step3: null, // Baseline on adversarial
    step4: null  // Hardened on adversarial
  };

  // Step 1: Original baseline detection
  results.step1 = await detectBaseline(email);

  // Step 2: Generate adversarial
  results.step2 = await generateAdversarial(email);

  // Step 3: Baseline on adversarial (should fail to detect)
  const adversarialEmail = {
    ...email,
    body: results.step2.adversarial_text
  };
  results.step3 = await detectBaseline(adversarialEmail);

  // Step 4: Hardened on adversarial (should catch)
  results.step4 = await detectPhishing(adversarialEmail);

  return results;
}
