export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  url: string;
  key: string;
  sort_order: number;
}

export interface Listing {
  id: string;
  user_id: string;
  category_id: number;
  status: "active" | "sold" | "expired" | "pending" | "removed";
  title: string;
  description: string;
  price: number | null;
  price_obo: boolean;
  year: number | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
  engine_cc: number | null;
  color: string | null;
  condition: "excellent" | "good" | "fair" | "parts" | null;
  vin: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  views: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
  photos?: ListingPhoto[];
  seller?: Pick<User, "id" | "name" | "city" | "state" | "created_at">;
}

export interface ListingCard
  extends Pick<
    Listing,
    | "id" | "title" | "price" | "price_obo" | "year" | "make" | "model"
    | "mileage" | "city" | "state" | "condition" | "created_at" | "status"
  > {
  cover_photo: string | null;
  category_name: string;
  category_slug: string;
}

export interface SearchFilters {
  q?: string;
  category?: string;
  state?: string;
  make?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  condition?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "mileage_asc";
  page?: number;
}
