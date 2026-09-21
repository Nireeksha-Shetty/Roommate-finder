const BASE = "http://localhost:8080/api";

async function request(path, options = {}) {
  const response = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Something went wrong. Is the backend running?");
  }
  return body;
}

export const api = {
  register: (payload) =>
    request("/register", { method: "POST", body: JSON.stringify(payload) }),

  login: (email, password) =>
    request("/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  me: (userId) => request(`/me/${userId}`),

  saveWallet: (userId, walletAddress) =>
    request(`/wallet/${userId}`, {
      method: "POST",
      body: JSON.stringify({ walletAddress })
    }),

  saveProfile: (profile) =>
    request("/profile", { method: "POST", body: JSON.stringify(profile) }),

  getProfile: (userId) => request(`/profile/${userId}`),

  /** Live filter values are passed as query params, not saved to the profile. */
  getMatches: (userId, { genderPreference, sharing } = {}) => {
    const params = new URLSearchParams();
    if (genderPreference) params.set("genderPreference", genderPreference);
    if (sharing) params.set("sharing", sharing);
    const query = params.toString();
    return request(`/matches/${userId}${query ? "?" + query : ""}`);
  },

  recordConsent: (granterId, receiverId, txHash) =>
    request("/consent", {
      method: "POST",
      body: JSON.stringify({ granterId, receiverId, txHash })
    }),

  getContact: (granterId, viewerId) =>
    request(`/contact/${granterId}?viewerId=${viewerId}`),

  /**
   * Asking to see someone's details. Kept in MySQL only - a request grants
   * nothing, so there is nothing worth writing to the chain, and putting it
   * there would publish who is interested in whom.
   */
  requestContact: (requesterId, ownerId) =>
    request("/requests", {
      method: "POST",
      body: JSON.stringify({ requesterId, ownerId })
    }),

  incomingRequests: (ownerId) => request(`/requests/incoming/${ownerId}`),

  outgoingRequests: (requesterId) => request(`/requests/outgoing/${requesterId}`),

  approveRequest: (id, txHash) =>
    request(`/requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ txHash })
    }),

  rejectRequest: (id) => request(`/requests/${id}/reject`, { method: "POST" }),

  addReview: (review) =>
    request("/reviews", { method: "POST", body: JSON.stringify(review) }),

  getReviews: (subjectId) => request(`/reviews/${subjectId}`),

  /**
   * Photos are not JSON, so these two bypass the helper above.
   * There is no public photo URL by design - see PhotoController.
   */
  uploadPhoto: async (userId, file) => {
    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`${BASE}/photo/${userId}`, {
      method: "POST",
      body: form
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "The photo could not be uploaded");
    return body;
  },

  deletePhoto: (userId) => request(`/photo/${userId}`, { method: "DELETE" }),

  /** The URL only returns bytes when the chain allows it; 403 otherwise. */
  photoUrl: (ownerId, viewerId) => `${BASE}/photo/${ownerId}?viewerId=${viewerId}`
};

export const SHARING = ["Single occupancy", "Double sharing", "Triple sharing"];

/** Rough per-person monthly cost in Chennai, used only to warn. */
export const SHARING_FLOOR = {
  "Single occupancy": 11000,
  "Double sharing": 7000,
  "Triple sharing": 4500
};

export const QUESTIONS = [
  { key: "sleepTime", label: "When do you usually sleep?", low: "Early night", high: "Very late" },
  { key: "cleanliness", label: "How tidy do you keep your room?", low: "Relaxed", high: "Spotless" },
  { key: "smoking", label: "Do you smoke?", low: "Never", high: "Regularly" },
  { key: "foodPref", label: "What do you eat?", low: "Vegetarian", high: "Non-vegetarian" },
  { key: "noiseTolerance", label: "How much noise can you study through?", low: "Need silence", high: "Noise is fine" },
  { key: "studyHabit", label: "Where do you study?", low: "Library or outside", high: "In the room" }
];

export const rupees = (n) => "\u20B9" + Number(n || 0).toLocaleString("en-IN");
export const shortShare = (v) => (v || "").replace(" occupancy", "").replace(" sharing", "");
export const genderWord = (g) =>
  g === "male" ? "Man" : g === "female" ? "Woman" : "Other";
export const genderPlural = (g) =>
  g === "male" ? "men" : g === "female" ? "women" : "others";

const TINTS = ["#e4f2f0", "#e2edf5", "#fdeee4", "#eaf3e6", "#f2ecf7", "#f6eede"];
export const tintFor = (id) => TINTS[Number(id) % TINTS.length];
export const initialsOf = (name) =>
  (name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** Lifestyle chips read straight off the six answers. */
export function tagsFor(m) {
  const t = [];
  t.push(m.smoking <= 2 ? "Non-smoker" : "Smoker");
  t.push(m.foodPref <= 2 ? "Vegetarian" : "Non-vegetarian");
  if (m.cleanliness >= 4) t.push("Very tidy");
  if (m.sleepTime <= 2) t.push("Early riser");
  if (m.sleepTime >= 4) t.push("Night owl");
  if (m.noiseTolerance <= 2) t.push("Needs quiet");
  return t;
}
