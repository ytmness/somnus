"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  createEmptyArtist,
  type ArtistForm,
  type EventFormData,
} from "../types";

interface EventMediaExtrasProps {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
}

function updateArtist(
  artists: ArtistForm[],
  index: number,
  patch: Partial<ArtistForm>
): ArtistForm[] {
  return artists.map((a, i) => (i === index ? { ...a, ...patch } : a));
}

export function EventMediaExtras({ data, onChange }: EventMediaExtrasProps) {
  const artists = data.artists;

  return (
    <div className="space-y-5" id="section-media">
      <div>
        <h3 className="text-[11px] uppercase tracking-wider text-white/45 mb-3">
          Links & media
        </h3>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="event-external-url"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              External URL
            </label>
            <input
              id="event-external-url"
              type="url"
              value={data.externalUrl}
              onChange={(e) => onChange({ externalUrl: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="https://…"
            />
          </div>
          <div>
            <label
              htmlFor="event-video-url"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              YouTube video URL
            </label>
            <input
              id="event-video-url"
              type="url"
              value={data.videoUrl}
              onChange={(e) => onChange({ videoUrl: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[11px] uppercase tracking-wider text-white/45 mb-1.5">
          Song / soundtrack
        </h3>
        <p className="text-[11px] text-white/35 mb-3">
          Apple Music API opcional — por ahora introduce los datos a mano.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="song-title"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Title
            </label>
            <input
              id="song-title"
              type="text"
              value={data.songTitle}
              onChange={(e) => onChange({ songTitle: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Track name"
            />
          </div>
          <div>
            <label
              htmlFor="song-artist"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Artist
            </label>
            <input
              id="song-artist"
              type="text"
              value={data.songArtist}
              onChange={(e) => onChange({ songArtist: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Artist name"
            />
          </div>
          <div>
            <label
              htmlFor="song-id"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Catalog ID
            </label>
            <input
              id="song-id"
              type="text"
              value={data.songId}
              onChange={(e) => onChange({ songId: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="Apple Music / catalog id"
            />
          </div>
          <div>
            <label
              htmlFor="song-preview"
              className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5"
            >
              Preview URL
            </label>
            <input
              id="song-preview"
              type="url"
              value={data.songPreviewUrl}
              onChange={(e) => onChange({ songPreviewUrl: e.target.value })}
              className="somnus-input !py-2.5 text-sm"
              placeholder="https://…"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-[11px] uppercase tracking-wider text-white/45">
            Lineup artists
          </h3>
          <button
            type="button"
            onClick={() =>
              onChange({
                artists: [...artists, createEmptyArtist(artists.length)],
              })
            }
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white border border-white/12 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Add artist
          </button>
        </div>

        {artists.length === 0 && (
          <p className="text-[11px] text-white/35">
            Optional — add DJs or performers for the public lineup.
          </p>
        )}

        <div className="space-y-3">
          {artists.map((a, index) => (
            <div
              key={index}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-white/50 pt-1">Artist {index + 1}</p>
                <button
                  type="button"
                  aria-label="Remove artist"
                  onClick={() =>
                    onChange({
                      artists: artists
                        .filter((_, i) => i !== index)
                        .map((row, i) => ({ ...row, sortOrder: i })),
                    })
                  }
                  className="p-1.5 rounded-md text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>
              <input
                type="text"
                value={a.name}
                onChange={(e) =>
                  onChange({
                    artists: updateArtist(artists, index, {
                      name: e.target.value,
                    }),
                  })
                }
                className="somnus-input !py-2.5 text-sm"
                placeholder="Name *"
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="url"
                  value={a.instagramUrl}
                  onChange={(e) =>
                    onChange({
                      artists: updateArtist(artists, index, {
                        instagramUrl: e.target.value,
                      }),
                    })
                  }
                  className="somnus-input !py-2.5 text-sm"
                  placeholder="Instagram URL"
                />
                <input
                  type="url"
                  value={a.spotifyUrl}
                  onChange={(e) =>
                    onChange({
                      artists: updateArtist(artists, index, {
                        spotifyUrl: e.target.value,
                      }),
                    })
                  }
                  className="somnus-input !py-2.5 text-sm"
                  placeholder="Spotify URL"
                />
              </div>
              <input
                type="url"
                value={a.imageUrl}
                onChange={(e) =>
                  onChange({
                    artists: updateArtist(artists, index, {
                      imageUrl: e.target.value,
                    }),
                  })
                }
                className="somnus-input !py-2.5 text-sm"
                placeholder="Image URL"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
