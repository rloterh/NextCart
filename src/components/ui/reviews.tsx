"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageSquare, Sparkles, Star, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";
import type { Review, ReviewStats } from "@/types/reviews";

interface ReviewFormProps {
  productId: string;
  storeId: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ productId, storeId, onSubmitted }: ReviewFormProps) {
  const { isAuthenticated, profile } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!rating) {
      addToast({ type: "error", title: "Please select a rating" });
      return;
    }

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      store_id: storeId,
      user_id: profile!.id,
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
    });

    if (error) {
      addToast({
        type: "error",
        title: error.code === "23505" ? "You already reviewed this product" : "Failed to submit",
        description: error.message,
      });
    } else {
      addToast({
        type: "success",
        title: "Review submitted",
        description: "Thanks for sharing details that help the next buyer purchase with confidence.",
      });
      setRating(0);
      setTitle("");
      setBody("");
      setIsOpen(false);
      onSubmitted?.();
    }

    setIsLoading(false);
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="border-b border-stone-200 pb-6 dark:border-stone-800">
      {!isOpen ? (
        <Button variant="outline" onClick={() => setIsOpen(true)} leftIcon={<MessageSquare className="h-4 w-4" />}>
          Write a review
        </Button>
      ) : (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-stone-400">Your rating</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          <Input label="Title" placeholder="Sum it up in a few words" value={title} onChange={(event) => setTitle(event.target.value)} />
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Review</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder="What stood out about the quality, shipping, packaging, or overall experience?"
              className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" isLoading={isLoading}>
              Submit review
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </motion.form>
      )}
    </div>
  );
}

function ReviewStatsBar({ stats }: { stats: ReviewStats }) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = stats.distribution[star] ?? 0;
        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

        return (
          <div key={star} className="flex items-center gap-3 text-sm">
            <span className="w-6 text-right text-xs text-stone-500">{star}</span>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <div className="h-2 flex-1 overflow-hidden bg-stone-100 dark:bg-stone-800">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${percentage}%` }} />
            </div>
            <span className="w-8 text-xs text-stone-400">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

interface ReviewListProps {
  productId: string;
  refreshKey?: number;
}

const emptyStats: ReviewStats = {
  average: 0,
  total: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  verifiedCount: 0,
  recommendationRate: 0,
};

export function ReviewList({ productId, refreshKey }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseBrowserClient();
      const { data, error: queryError } = await supabase
        .from("reviews")
        .select("*, profile:profiles(full_name, avatar_url)")
        .eq("product_id", productId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setReviews([]);
        setStats(emptyStats);
        setLoading(false);
        return;
      }

      const nextReviews = (data ?? []) as Review[];
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let verifiedCount = 0;
      let recommendedCount = 0;

      nextReviews.forEach((review) => {
        distribution[review.rating] = (distribution[review.rating] ?? 0) + 1;
        if (review.is_verified_purchase) {
          verifiedCount += 1;
        }
        if (review.rating >= 4) {
          recommendedCount += 1;
        }
      });

      const average = nextReviews.length > 0 ? nextReviews.reduce((sum, review) => sum + review.rating, 0) / nextReviews.length : 0;

      setReviews(nextReviews);
      setStats({
        average,
        total: nextReviews.length,
        distribution,
        verifiedCount,
        recommendationRate: nextReviews.length > 0 ? Math.round((recommendedCount / nextReviews.length) * 100) : 0,
      });
      setLoading(false);
    }

    void fetchReviews();
  }, [productId, refreshKey]);

  const headline = useMemo(() => {
    if (stats.total === 0) {
      return "No buyer reviews yet";
    }

    if (stats.average >= 4.6) {
      return "Buyers consistently call this out for standout quality";
    }

    if (stats.average >= 4) {
      return "Buyers are having a strong overall experience";
    }

    return "Review details can help set the right expectation before purchase";
  }, [stats.average, stats.total]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        We could not load reviews right now. {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 grid gap-6 border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Buyer sentiment</p>
          <div className="mt-4 flex items-end gap-4">
            <p className="font-serif text-5xl text-stone-900 dark:text-white">{stats.total > 0 ? stats.average.toFixed(1) : "-"}</p>
            <div className="pb-2">
              <StarRating value={Math.round(stats.average)} readonly size="sm" />
              <p className="mt-1 text-xs text-stone-400">
                {stats.total} review{stats.total !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-stone-500">{headline}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_220px]">
          <ReviewStatsBar stats={stats} />
          <div className="grid gap-3">
            <div className="border border-stone-200 p-4 dark:border-stone-700">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">
                <Sparkles className="h-3.5 w-3.5" />
                Recommendation rate
              </div>
              <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{stats.recommendationRate}%</p>
              <p className="mt-1 text-xs text-stone-500">of buyers left a 4 or 5 star rating.</p>
            </div>
            <div className="border border-stone-200 p-4 dark:border-stone-700">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified purchases
              </div>
              <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{stats.verifiedCount}</p>
              <p className="mt-1 text-xs text-stone-500">reviews came from confirmed marketplace orders.</p>
            </div>
          </div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="border border-dashed border-stone-200 px-6 py-10 text-center dark:border-stone-700">
          <p className="font-serif text-xl text-stone-900 dark:text-white">No reviews yet</p>
          <p className="mt-2 text-sm text-stone-500">Be the first buyer to share quality, shipping, and packaging feedback for this product.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-stone-100 pb-6 dark:border-stone-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StarRating value={review.rating} readonly size="sm" />
                    {review.is_verified_purchase ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified purchase
                      </span>
                    ) : null}
                  </div>
                  {review.title ? <p className="mt-1 text-sm font-medium text-stone-900 dark:text-white">{review.title}</p> : null}
                </div>
                <p className="text-xs text-stone-400">{formatDate(review.created_at)}</p>
              </div>
              {review.body ? <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{review.body}</p> : null}
              <div className="mt-3 flex items-center gap-4">
                <p className="text-xs text-stone-500">{review.profile?.full_name ?? "Anonymous buyer"}</p>
                <button type="button" className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
                  <ThumbsUp className="h-3 w-3" />
                  Helpful ({review.helpful_count})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
