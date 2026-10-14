/* =========================================================
   JAZZY COLLECTION — Feedback App
   Handles: star rating, form submit → Supabase, load reviews
   ========================================================= */

// --- Supabase client ---
// NOTE: named `db` because the CDN UMD build already declares a global `supabase`;
// re-declaring `let supabase` here would throw a SyntaxError and kill the script.
let db = null;
if (window.supabase && SUPABASE_URL && !SUPABASE_URL.includes("YOUR-PROJECT")) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("Supabase is not configured yet. Edit supabase-config.js with your project URL and anon key.");
}

const TABLE = "feedback"; // Supabase table name

// --- Elements ---
const form         = document.getElementById("feedbackForm");
const nameInput    = document.getElementById("customerName");
const feedbackBox  = document.getElementById("feedbackText");
const ratingHidden = document.getElementById("ratingValue");
const ratingLabel  = document.getElementById("ratingLabel");
const submitBtn    = document.getElementById("submitBtn");
const formStatus   = document.getElementById("formStatus");
const reviewsGrid  = document.getElementById("reviewsGrid");

const RATING_TEXT = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent"
};

// --- Footer year ---
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   Star rating widget
   ========================================================= */
const stars = Array.from(document.querySelectorAll(".star"));

function paintStars(count) {
  stars.forEach((s, i) => {
    s.classList.toggle("active", i < count);
    s.setAttribute("aria-checked", i === count - 1 ? "true" : "false");
  });
  ratingLabel.textContent = count > 0 ? `${count} / 5 — ${RATING_TEXT[count]}` : "Select a rating";
}

stars.forEach((star) => {
  star.addEventListener("click", () => {
    const value = Number(star.dataset.value);
    ratingHidden.value = value;
    paintStars(value);
  });

  // hover preview
  star.addEventListener("mouseenter", () => {
    paintStars(Number(star.dataset.value));
  });
});

document.getElementById("starRating").addEventListener("mouseleave", () => {
  paintStars(Number(ratingHidden.value));
});

/* =========================================================
   Submit feedback → Supabase
   ========================================================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formStatus.textContent = "";
  formStatus.className = "form-status";

  const rating = Number(ratingHidden.value);
  if (rating < 1) {
    formStatus.textContent = "Please select a star rating.";
    formStatus.classList.add("error");
    return;
  }

  if (!db) {
    formStatus.textContent = "Site is not connected to Supabase yet. Please contact the site admin.";
    formStatus.classList.add("error");
    return;
  }

  const payload = {
    customer_name: nameInput.value.trim(),
    rating: rating,
    feedback: feedbackBox.value.trim(),
    created_at: new Date().toISOString()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    const { error } = await db.from(TABLE).insert(payload);
    if (error) throw error;

    formStatus.textContent = "Thank you! Your feedback has been submitted.";
    formStatus.classList.add("success");
    form.reset();
    ratingHidden.value = 0;
    paintStars(0);
    loadReviews();
  } catch (err) {
    console.error(err);
    formStatus.textContent = "Something went wrong while saving. Please try again.";
    formStatus.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Feedback";
  }
});

/* =========================================================
   Load & display recent reviews
   ========================================================= */
async function loadReviews() {
  if (!db) {
    reviewsGrid.innerHTML = `<p class="muted">Reviews will appear here once the site is connected to Supabase.</p>`;
    return;
  }

  const { data, error } = await db
    .from(TABLE)
    .select("customer_name, rating, feedback, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    reviewsGrid.innerHTML = `<p class="muted">Could not load reviews.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    reviewsGrid.innerHTML = `<p class="muted">No reviews yet — be the first to share your experience!</p>`;
    return;
  }

  reviewsGrid.innerHTML = "";
  data.forEach((r) => {
    const card = document.createElement("div");
    card.className = "review-card";

    const full = "★".repeat(r.rating);
    const empty = "☆".repeat(5 - r.rating);
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric"
    }) : "";

    card.innerHTML = `
      <div class="review-top">
        <span class="review-name"></span>
        <span class="review-stars">${full}<span class="empty">${empty}</span></span>
      </div>
      <p class="review-text"></p>
      <span class="review-date">${date}</span>
    `;
    // safe insertion of user content (no HTML injection)
    card.querySelector(".review-name").textContent = r.customer_name;
    card.querySelector(".review-text").textContent = r.feedback;

    reviewsGrid.appendChild(card);
  });
}

loadReviews();
