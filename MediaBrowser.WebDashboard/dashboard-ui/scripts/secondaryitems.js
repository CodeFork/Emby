﻿(function ($, document) {

    var data = {};

    function addCurrentItemToQuery(query, item) {

        if (item.Type == "Person") {
            query.PersonIds = item.Id;
        }
        else if (item.Type == "Genre") {
            query.Genres = item.Name;
        }
        else if (item.Type == "MusicGenre") {
            query.Genres = item.Name;
        }
        else if (item.Type == "GameGenre") {
            query.Genres = item.Name;
        }
        else if (item.Type == "Studio") {
            query.StudioIds = item.Id;
        }
        else if (item.Type == "MusicArtist") {
            query.ArtistIds = item.Id;
        } else {
            query.ParentId = item.Id;
        }
    }

    function getQuery(parentItem) {

        var key = getSavedQueryKey();
        var pageData = data[key];

        if (!pageData) {
            pageData = data[key] = {
                query: {
                    SortBy: "SortName",
                    SortOrder: "Ascending",
                    Recursive: true,
                    Fields: "PrimaryImageAspectRatio,SortName,SyncInfo",
                    ImageTypeLimit: 1,
                    EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
                    StartIndex: 0,
                    Limit: LibraryBrowser.getDefaultPageSize()
                }
            };

            var type = getParameterByName('type');
            if (type) {
                pageData.query.IncludeItemTypes = type;
            }

            var filters = getParameterByName('filters');
            if (type) {
                pageData.query.Filters = filters;
            }

            if (parentItem) {
                addCurrentItemToQuery(pageData.query, parentItem);
            }

            LibraryBrowser.loadSavedQueryValues(key, pageData.query);
        }
        return pageData.query;
    }

    function getSavedQueryKey() {

        return getWindowUrl();
    }

    function onListItemClick(e) {

        var page = $(this).parents('.page')[0];
        var info = LibraryBrowser.getListItemInfo(this);

        if (info.mediaType == 'Photo') {
            var query = getQuery();

            require(['scripts/photos'], function () {
                Photos.startSlideshow(page, query, info.id);
            });
            return false;
        }
    }

    function reloadItems(page, parentItem) {

        Dashboard.showLoadingMsg();

        var query = getQuery(parentItem);

        ApiClient.getItems(Dashboard.getCurrentUserId(), query).done(function (result) {

            // Scroll back up so they can see the results from the beginning
            window.scrollTo(0, 0);

            var html = '';
            var pagingHtml = LibraryBrowser.getQueryPagingHtml({
                startIndex: query.StartIndex,
                limit: query.Limit,
                totalRecordCount: result.TotalRecordCount,
                showLimit: false
            });

            page.querySelector('.listTopPaging').innerHTML = pagingHtml;
            var trigger = false;

            if (query.IncludeItemTypes == "Audio") {

                html = '<div style="max-width:1000px;margin:auto;">' + LibraryBrowser.getListViewHtml({
                    items: result.Items,
                    playFromHere: true,
                    defaultAction: 'playallfromhere',
                    smallIcon: true
                }) + '</div>';
                trigger = true;

            } else {
                var posterOptions = {
                    items: result.Items,
                    shape: "auto",
                    centerText: true,
                    lazy: true
                };

                if (query.IncludeItemTypes == "MusicAlbum") {
                    posterOptions.overlayText = false;
                    posterOptions.showParentTitle = true;
                    posterOptions.overlayPlayButton = true;
                }
                else if (query.IncludeItemTypes == "MusicArtist") {
                    posterOptions.overlayText = false;
                    posterOptions.overlayPlayButton = true;
                }
                else if (query.IncludeItemTypes == "Episode") {
                    posterOptions.overlayText = false;
                    posterOptions.showParentTitle = true;
                    posterOptions.overlayPlayButton = true;
                    posterOptions.centerText = false;
                }

                // Poster
                html = LibraryBrowser.getPosterViewHtml(posterOptions);
            }

            var elem = page.querySelector('#items');
            elem.innerHTML = html + pagingHtml;
            ImageLoader.lazyChildren(elem);

            if (trigger) {
                $(elem).trigger('create');
            }

            $('.btnNextPage', page).on('click', function () {
                query.StartIndex += query.Limit;
                reloadItems(page, parentItem);
            });

            $('.btnPreviousPage', page).on('click', function () {
                query.StartIndex -= query.Limit;
                reloadItems(page, parentItem);
            });

            LibraryBrowser.setLastRefreshed(page);
            Dashboard.hideLoadingMsg();
        });
    }

    $(document).on('pageinitdepends', "#secondaryItemsPage", function () {

        var page = this;

        $(page).on('click', '.mediaItem', onListItemClick);

    }).on('pagebeforeshowready', "#secondaryItemsPage", function () {

        var page = this;

        if (getParameterByName('parentid')) {
            ApiClient.getItem(Dashboard.getCurrentUserId(), getParameterByName('parentid')).done(function (parent) {
                LibraryMenu.setTitle(parent.Name);

                if (LibraryBrowser.needsRefresh(page)) {
                    reloadItems(page, parent);
                }
            });
        }

        else if (LibraryBrowser.needsRefresh(page)) {
            reloadItems(page);
        }
    });

})(jQuery, document);