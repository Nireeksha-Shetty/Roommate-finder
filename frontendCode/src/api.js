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
  register: (user) =>
    request("/register", { method: "POST", body: JSON.stringify(user) }),

  login: (email, password) =>
    request("/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  saveWallet: (userId, walletAddress) =>
    request(`/wallet/${userId}`, {
      method: "POST",
      body: JSON.stringify({ walletAddress })
    }),

  saveProfile: (profile) =>
    request("/profile", { method: "POST", body: JSON.stringify(profile) }),

  getProfile: (userId) => request(`/profile/${userId}`),

  getMatches: (userId) => request(`/matches/${userId}`),

  recordConsent: (granterId, receiverId, txHash) =>
    request("/consent", {
      method: "POST",
      body: JSON.stringify({ granterId, receiverId, txHash })
    }),

  getContact: (granterId, viewerId) =>
    request(`/contact/${granterId}?viewerId=${viewerId}`),

  addReview: (review) =>
    request("/reviews", { method: "POST", body: JSON.stringify(review) }),

  getReviews: (subjectId) => request(`/reviews/${subjectId}`),

  // Asking to see someone's details. Held in MySQL, not on the chain - a
  // request carries no permission, so there is nothing to put on chain.
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
      body: JSON.stringify({ txHash: txHash || null })
    }),

  rejectRequest: (id) => request(`/requests/${id}/reject`, { method: "POST" })
};
