"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ThumbsUp, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import type { Review, ReviewStats } from "@/types/reviews";

// ============================================
// REVIEW FORM
// ============================================

interface ReviewFormProps {
  productId: string;
  storeId: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ productId, storeId, onSubmitted }: ReviewFormProps) {
  const { isAuthenticated, profile } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { addToast({ type: "error", title: "Please select a rating" }); return; }

    setIsLoading(true);
    const sb = getSupabaseBrowserClient();

    const { error } = await sb.from("reviews").insert({
      product_id: productId,
      store_id: storeId,
      user_id: profile!.id,
      rating,
      title: title || null,
      body: body || null,
    });

    if (error) {
      addToast({ type: "error", title: error.code === "23505" ? "You already reviewed this product" : "Failed to submit", description: error.message });
    } else {
      addToast({ type: "success", title: "Review submitted!" });
      setRating(0); setTitle(""); setBody(""); setIsOpen(false);
      onSubmitted?.();
    }
    setIsLoading(false);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="border-b border-stone-200 pb-6 dark:border-stone-800">
      {!isOpen ? (
        <Button variant="outline" onClick={() => setIsOpen(true)} leftIcon={<MessageSquare className="h-4 w-4" />}>
          Write a review
        </Button>
      ) : (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-400">Your rating</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          <Input label="Title" placeholder="Sum it up in a few words" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-stone-500">Review</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="What did you like or dislike?"
              className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" isLoading={isLoading}>Submit review</Button>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          </div>
        </motion.form>
      )}
    </div>
  );
}

// ============================================
// REVIEW STATS BAR
// ============================================

export function ReviewStatsBar({ stats }: { stats: ReviewStats }) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = stats.distribution[star] ?? 0;
        const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-3 text-sm">
            <span className="w-6 text-right text-xs text-stone-500">{star}</span>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <div className="h-2 flex-1 overflow-hidden bg-stone-100 dark:bg-stone-800">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 text-xs text-stone-400">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

import { Star } from "lucide-react";

// ============================================
// REVIEW LIST
// ============================================

interface ReviewListProps {
  productId: string;
  refreshKey?: number;
}

export function ReviewList({ productId, refreshKey }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average: 0, total: 0, distribution: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const sb = getSupabaseBrowserClient();
      const { data } = await sb
        .from("reviews")
        .select("*, profile:profiles(full_name, avatar_url)")
        .eq("product_id", productId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      const revs = (data ?? []) as Review[];
      setReviews(revs);

      // Calculate stats
      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      revs.forEach((r) => { dist[r.rating] = (dist[r.rating] ?? 0) + 1; });
      const avg = revs.length > 0 ? revs.reduce((s, r) => s + r.rating, 0) / revs.length : 0;
      setStats({ average: avg, total: revs.length, distribution: dist });
      setLoading(false);
    }
    fetch();
  }, [productId, refreshKey]);

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse bg-stone-100 dark:bg-stone-800" />)}</div>;

  return (
    <div>
      {/* Stats summary */}
      {stats.total > 0 && (
        <div className="mb-8 grid gap-8 sm:grid-cols-2">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-serif text-4xl text-stone-900 dark:text-white">{stats.average.toFixed(1)}</p>
              <StarRating value={Math.round(stats.average)} readonly size="sm" />
              <p className="mt-1 text-xs text-stone-400">{stats.total} review{stats.total !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <ReviewStatsBar stats={stats} />
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-stone-100 pb-6 dark:border-stone-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating value={review.rating} readonly size="sm" />
                    {review.is_verified_purchase && (
                      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />Verified
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <p className="mt-1 text-sm font-medium text-stone-900 dark:text-white">{review.title}</p>
                  )}
                </div>
                <p className="text-xs text-stone-400">{formatDate(review.created_at)}</p>
              </div>
              {review.body && (
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{review.body}</p>
              )}
              <div className="mt-3 flex items-center gap-4">
                <p className="text-xs text-stone-500">{review.profile?.full_name ?? "Anonymous"}</p>
                <button className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600">
                  <ThumbsUp className="h-3 w-3" />Helpful ({review.helpful_count})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
