import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Download, Trash2, Upload, Play, X, Check, WifiOff, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { offlineStore, type SavedVideo } from "@/lib/offline-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reel — Your videos, offline on your phone" },
      { name: "description", content: "Upload videos from desktop or phone, then save them to watch offline anywhere." },
      { property: "og:title", content: "Reel — Your videos, offline on your phone" },
      { property: "og:description", content: "Upload videos from desktop or phone, then save them to watch offline anywhere." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type CloudVideo = {
  id: string;
  title: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
};

const fmtSize = (b: number) =>
  b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(0.1, b / 1e6).toFixed(1)} MB`;

function Index() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!ready)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-5 fill-current" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Reel</h1>
            <p className="font-mono text-xs text-muted-foreground">your video vault</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-mono text-xs">
              <WifiOff className="size-3.5" /> offline
            </span>
          )}
          {session && online && (
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut /> Sign out
            </Button>
          )}
        </div>
      </header>
      {session || !online ? <Library session={session} online={online} /> : <AuthCard />}
    </main>
  );
}

function AuthCard() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (mode === "up" && !res.data.session) toast.success("Check your email to confirm your account.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  };

  return (
    <section className="mx-auto mt-10 max-w-md">
      <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
        Upload anywhere.
        <br />
        <span className="text-primary">Watch offline.</span>
      </h2>
      <p className="mt-3 text-muted-foreground">
        Sign in with the same account on your computer and your phone — your videos follow you.
      </p>
      <div className="mt-8 rounded-2xl border bg-card p-6">
        <Button type="button" variant="outline" className="w-full" onClick={google}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </Button>
        <div className="my-5 flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </div>
    </section>
  );
}

function Library({ session, online }: { session: Session | null; online: boolean }) {
  const [cloud, setCloud] = useState<CloudVideo[]>([]);
  const [saved, setSaved] = useState<SavedVideo[]>([]);
  const [uploads, setUploads] = useState<{ name: string; done: boolean }[]>([]);
  const [saving, setSaving] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState<{ title: string; src: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setSaved(await offlineStore.all());
    if (!session || !navigator.onLine) return;
    const { data, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setCloud(data as CloudVideo[]);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load, online]);

  const upload = async (files: FileList | File[]) => {
    if (!session) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|m4v)$/i.test(f.name));
    if (!list.length) {
      toast.error("Pick a video file.");
      return;
    }
    for (const f of list) {
      setUploads((u) => [...u, { name: f.name, done: false }]);
      const path = `${session.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("videos").upload(path, f, { contentType: f.type || "video/mp4" });
      if (!error) {
        const { error: e2 } = await supabase.from("videos").insert({
          title: f.name.replace(/\.[^.]+$/, ""),
          storage_path: path,
          size_bytes: f.size,
          mime_type: f.type || "video/mp4",
        });
        if (e2) toast.error(e2.message);
        else toast.success(`Uploaded ${f.name}`);
      } else toast.error(`${f.name}: ${error.message}`);
      setUploads((u) => u.filter((x) => x.name !== f.name));
    }
    void load();
  };

  const saveOffline = async (v: CloudVideo) => {
    setSaving((s) => ({ ...s, [v.id]: 0 }));
    try {
      const { data, error } = await supabase.storage.from("videos").createSignedUrl(v.storage_path, 3600);
      if (error) throw error;
      const res = await fetch(data.signedUrl);
      const total = Number(res.headers.get("content-length")) || v.size_bytes;
      const reader = res.body!.getReader();
      const chunks: BlobPart[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        setSaving((s) => ({ ...s, [v.id]: Math.round((got / total) * 100) }));
      }
      await offlineStore.put({
        id: v.id,
        title: v.title,
        mime_type: v.mime_type,
        size_bytes: v.size_bytes,
        created_at: v.created_at,
        blob: new Blob(chunks, { type: v.mime_type }),
      });
      toast.success(`"${v.title}" is saved on this device`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save video");
    }
    setSaving(({ [v.id]: _, ...rest }) => rest);
    void load();
  };

  const play = async (id: string, title: string, path?: string) => {
    const local = saved.find((s) => s.id === id);
    if (local) {
      setPlaying({ title, src: URL.createObjectURL(local.blob) });
      return;
    }
    if (!path) return;
    const { data, error } = await supabase.storage.from("videos").createSignedUrl(path, 3600);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPlaying({ title, src: data.signedUrl });
  };

  const removeFromDevice = async (id: string) => {
    await offlineStore.remove(id);
    void load();
  };

  const deleteEverywhere = async (v: CloudVideo) => {
    if (!confirm(`Delete "${v.title}" from your account?`)) return;
    await supabase.storage.from("videos").remove([v.storage_path]);
    await supabase.from("videos").delete().eq("id", v.id);
    await offlineStore.remove(v.id);
    void load();
  };

  const savedIds = new Set(saved.map((s) => s.id));
  const items: (CloudVideo & { localOnly?: boolean })[] = online
    ? cloud
    : saved.map((s) => ({ ...s, storage_path: "", localOnly: true }));

  return (
    <>
      {online && session && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={`mb-8 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-accent" : "border-border bg-card hover:border-primary"}`}
        >
          <Upload className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-display text-lg font-semibold">Add videos</p>
          <p className="text-sm text-muted-foreground">Tap to pick, or drop files here on desktop</p>
          <input ref={fileRef} type="file" accept="video/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
          {uploads.map((u) => (
            <p key={u.name} className="mt-3 flex items-center justify-center gap-2 font-mono text-xs">
              <Loader2 className="size-3.5 animate-spin" /> uploading {u.name}…
            </p>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold">{online ? "All your videos" : "Saved on this device"}</h2>
        <span className="font-mono text-xs text-muted-foreground">{saved.length} saved offline</span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          {online ? "No videos yet. Add one above." : "Nothing saved on this device yet. Go online and tap the download button on a video."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((v) => {
            const isSaved = savedIds.has(v.id);
            const pct = saving[v.id];
            return (
              <li key={v.id} className="group flex items-center gap-4 rounded-2xl border bg-card p-3">
                <button
                  onClick={() => play(v.id, v.title, v.storage_path)}
                  className="grid size-16 shrink-0 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                  aria-label={`Play ${v.title}`}
                >
                  <Play className="size-6 fill-current" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{v.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {fmtSize(v.size_bytes)}
                    {isSaved && <span className="ml-2 text-primary">● on device</span>}
                  </p>
                  {pct !== undefined && <Progress value={pct} className="mt-2 h-1.5" />}
                </div>
                <div className="flex shrink-0 gap-1">
                  {isSaved ? (
                    <Button size="icon" variant="ghost" title="Remove from this device" onClick={() => removeFromDevice(v.id)}>
                      <Check className="text-primary" />
                    </Button>
                  ) : (
                    online && (
                      <Button size="icon" variant="ghost" title="Save for offline" disabled={pct !== undefined} onClick={() => saveOffline(v)}>
                        {pct !== undefined ? <Loader2 className="animate-spin" /> : <Download />}
                      </Button>
                    )
                  )}
                  {online && !v.localOnly && (
                    <Button size="icon" variant="ghost" title="Delete" onClick={() => deleteEverywhere(v)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {playing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between p-4">
            <p className="truncate font-display font-semibold">{playing.title}</p>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (playing.src.startsWith("blob:")) URL.revokeObjectURL(playing.src);
                setPlaying(null);
              }}
            >
              <X />
            </Button>
          </div>
          <video src={playing.src} controls autoPlay playsInline className="min-h-0 w-full flex-1 bg-background" />
        </div>
      )}
    </>
  );
}
