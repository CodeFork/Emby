﻿using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Audio;
using MediaBrowser.Model.Entities;
using System;
using System.Linq;

namespace MediaBrowser.Providers.Music
{
    public static class LastfmHelper
    {
        public static void ProcessArtistData(BaseItem artist, LastfmArtist data)
        {
            var yearFormed = 0;

            if (data.bio != null)
            {
                Int32.TryParse(data.bio.yearformed, out yearFormed);
                if (!artist.LockedFields.Contains(MetadataFields.Overview))
                {
                    artist.Overview = data.bio.content;
                }
                if (!string.IsNullOrEmpty(data.bio.placeformed) && !artist.LockedFields.Contains(MetadataFields.ProductionLocations))
                {
                    artist.AddProductionLocation(data.bio.placeformed);
                }
            }

            artist.PremiereDate = yearFormed > 0 ? new DateTime(yearFormed, 1, 1, 0, 0, 0, DateTimeKind.Utc) : (DateTime?)null;
            artist.ProductionYear = yearFormed;
            if (data.tags != null && !artist.LockedFields.Contains(MetadataFields.Tags))
            {
                AddTags(artist, data.tags);
            }

            var musicArtist = artist as MusicArtist;

            if (musicArtist != null)
            {
                musicArtist.LastFmImageUrl = GetImageUrl(data);
            }

            var artistByName = artist as Artist;

            if (artistByName != null)
            {
                artistByName.LastFmImageUrl = GetImageUrl(data);
            }
        }

        private static string GetImageUrl(IHasLastFmImages data)
        {
            if (data.image == null)
            {
                return null;
            }

            var validImages = data.image
                .Where(i => !string.IsNullOrWhiteSpace(i.url))
                .ToList();

            var img = validImages
                .FirstOrDefault(i => string.Equals(i.size, "mega", StringComparison.OrdinalIgnoreCase)) ??
                data.image.FirstOrDefault(i => string.Equals(i.size, "extralarge", StringComparison.OrdinalIgnoreCase)) ??
                data.image.FirstOrDefault(i => string.Equals(i.size, "large", StringComparison.OrdinalIgnoreCase)) ?? 
                data.image.FirstOrDefault(i => string.Equals(i.size, "medium", StringComparison.OrdinalIgnoreCase)) ?? 
                data.image.FirstOrDefault();

            if (img != null)
            {
                return img.url;
            }

            return null;
        }

        public static void ProcessArtistData(MusicArtist source, Artist target)
        {
            target.PremiereDate = source.PremiereDate;
            target.ProductionYear = source.ProductionYear;
            target.Tags = source.Tags.ToList();
            target.Overview = source.Overview;
            target.ProductionLocations = source.ProductionLocations.ToList();
        }
        
        public static void ProcessAlbumData(BaseItem item, LastfmAlbum data)
        {
            if (!string.IsNullOrWhiteSpace(data.mbid)) item.SetProviderId(MetadataProviders.Musicbrainz, data.mbid);

            var overview = data.wiki != null ? data.wiki.content : null;

            if (!item.LockedFields.Contains(MetadataFields.Overview))
            {
                item.Overview = overview;
            }

            DateTime release;

            if (DateTime.TryParse(data.releasedate, out release) && release.Year != 1901)
            {
                item.PremiereDate = release;
                item.ProductionYear = release.Year;
            }

            if (data.toptags != null && !item.LockedFields.Contains(MetadataFields.Tags))
            {
                AddTags(item, data.toptags);
            }

            var album = (MusicAlbum)item;
            album.LastFmImageUrl = GetImageUrl(data);
        }

        private static void AddTags(BaseItem item, LastfmTags tags)
        {
            var itemTags = (from tag in tags.tag where !string.IsNullOrEmpty(tag.name) select tag.name).ToList();

            item.Tags = itemTags;
        }
    }
}
