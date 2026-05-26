"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CATEGORIES, DIFFICULTIES, TYPES, type Challenge } from "@/lib/types";
import { slugify } from "@/lib/utils";

type Props = {
  initial?: Partial<Challenge>;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

type LocalImage = { tag: string; port: number | null };

export function ChallengeForm({ initial, action, submitLabel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [fileUrl, setFileUrl] = useState(initial?.file_url ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [containerPort, setContainerPort] = useState<number | string>(initial?.container_port ?? 80);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const [images, setImages] = useState<LocalImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function loadImages(all: boolean) {
    setImagesLoading(true);
    setImagesError(null);
    try {
      const res = await fetch(`/api/admin/images${all ? "?all=1" : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setImages(data.images);
    } catch (e) {
      setImagesError(e instanceof Error ? e.message : "failed");
    } finally {
      setImagesLoading(false);
    }
  }

  useEffect(() => {
    loadImages(showAll);
  }, [showAll]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const path = `uploads/${safeName}`;
    const { error } = await supabase.storage.from("challenge-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("challenge-files").getPublicUrl(path);
    setFileUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <form
      action={(fd) => start(() => action(fd))}
      className="space-y-4 max-w-2xl"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!initial?.slug) setSlug(slugify(e.target.value));
            }}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (markdown OK)</Label>
        <Textarea id="description" name="description" rows={6} defaultValue={initial?.description ?? ""} required />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue={initial?.category ?? "misc"}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select id="difficulty" name="difficulty" defaultValue={initial?.difficulty ?? "easy"}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue={initial?.type ?? "static"}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="points">Points</Label>
          <Input id="points" name="points" type="number" min={0} defaultValue={initial?.points ?? 100} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="flag">Flag body (no prefix, no braces)</Label>
        <Input
          id="flag"
          name="flag"
          defaultValue={initial?.flag ?? ""}
          placeholder="hello_world"
          required
        />
        <p className="text-xs text-muted-foreground">
          Each event wraps this with its own prefix at submit time —
          e.g. <code>KTH{`{hello_world}`}</code>, <code>NIL{`{hello_world}`}</code>.
          For dynamic challenges this field is ignored (the per-team flag is generated).
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-3">
        <div className="flex items-center justify-between">
          <Label>Docker image (dynamic only)</Label>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              show all
            </label>
            <button type="button" className="underline" onClick={() => loadImages(showAll)}>
              refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={images.some((i) => i.tag === image) ? image : ""}
            onChange={(e) => {
              const tag = e.target.value;
              if (!tag) return;
              setImage(tag);
              const found = images.find((i) => i.tag === tag);
              if (found?.port) setContainerPort(found.port);
            }}
          >
            <option value="">
              {imagesLoading
                ? "loading local images…"
                : imagesError
                ? `(${imagesError}) — type below`
                : images.length === 0
                ? "no local images — type below"
                : `pick from ${images.length} local image${images.length === 1 ? "" : "s"}…`}
            </option>
            {images.map((i) => (
              <option key={i.tag} value={i.tag}>
                {i.tag}{i.port ? `  (port ${i.port})` : ""}
              </option>
            ))}
          </Select>
          <Input
            id="container_port"
            name="container_port"
            type="number"
            min={1}
            max={65535}
            placeholder="80"
            value={containerPort}
            onChange={(e) => setContainerPort(e.target.value)}
          />
        </div>

        <Input
          id="image"
          name="image"
          placeholder="or type a custom tag, e.g. ctfaas/web-cookie:latest"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Attachment</Label>
        <div className="flex flex-col gap-2">
          <Input type="file" onChange={onUpload} disabled={uploading} />
          <Input
            type="url"
            name="file_url"
            placeholder="https://... (auto-filled after upload, or paste a URL)"
            value={fileUrl ?? ""}
            onChange={(e) => setFileUrl(e.target.value)}
          />
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? false} />
        Published (visible to organizers)
      </label>

      <Button type="submit" disabled={pending || uploading}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
