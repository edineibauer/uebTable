(function ($, window, document) {
    var MaterializePagination = function (elem, options) {
        this.$elem = $(elem);
        this.options = options;
        this.currentPage = null;
        this.visiblePages = []
    };
    MaterializePagination.prototype = {
        defaults: {
            align: 'left',
            lastPage: 1,
            firstPage: 1,
            maxVisiblePages: 3,
            urlParameter: 'page',
            useUrlParameter: !1,
            onClickCallback: function () {
            }
        }, init: function () {
            this.config = $.extend({}, this.defaults, this.options);
            if (this.createPaginationBase(this.config.currentPage))
                this.bindClickEvent()
        }, createPaginationBase: function (requestedPage) {
            if (isNaN(this.config.firstPage) || isNaN(this.config.lastPage)) {
                console.error('Both firstPage and lastPage attributes need to be integer values');
                return !1
            } else if (this.config.firstPage > this.config.lastPage) {
                console.error('Value of firstPage must be less than the value of lastPage');
                return !1
            }
            this.config.firstPage = parseInt(this.config.firstPage);
            this.config.lastPage = parseInt(this.config.lastPage);
            this.currentPage = this.config.firstPage - this.config.maxVisiblePages;
            this.$container = $('<ul class="bar" style="-webkit-touch-callout: none;-webkit-user-select: none;-khtml-user-select: none;-moz-user-select: none; -ms-user-select: none; user-select: none;">').addClass('pagination padding-16').addClass(this.config.align + '-align');
            this.$prevEllipsis = this.util.Ellipsis();
            this.$nextEllipsis = this.util.Ellipsis();
            var $firstPage = this.util.createPage(this.config.firstPage);
            var $prevChevron = this.util.createChevron('prev');
            var $nextChevron = this.util.createChevron('next');
            this.$container.append($prevChevron).append($firstPage).append(this.$prevEllipsis.$elem).append(this.$nextEllipsis.$elem).append($nextChevron);
            if (this.config.lastPage > this.config.firstPage) {
                var $lastPage = this.util.createPage(this.config.lastPage);
                $lastPage.insertBefore($nextChevron)
            }
            this.requestPage(requestedPage, !0);
            this.renderActivePage();
            this.$elem.append(this.$container);
            return !0
        }, requestPage: function (requestedPage, initing) {
            if (requestedPage !== this.currentPage) {
                this.requestPageByNumber(requestedPage)
            }
            if (!initing)
                this.config.onClickCallback(this.currentPage);
            this.renderActivePage();
            if (this.config.useUrlParameter)
                this.updateUrlParam(this.config.urlParameter, this.currentPage)
        }, requestPageByNumber: function (requestedPage) {
            this.purgeVisiblePages();
            this.currentPage = requestedPage;
            for (var i = this.currentPage - this.config.maxVisiblePages; i < this.currentPage + this.config.maxVisiblePages + 1; i++) {
                this.visiblePages.push(this.insertNextPaginationComponent(i))
            }
        }, renderActivePage: function () {
            this.renderEllipsis();
            this.$container.find('li.active').removeClass('active');
            var currentPageComponent = $(this.$container.find('[data-page="' + this.currentPage + '"]')[0]);
            currentPageComponent.addClass('active z-depth-2')
        }, renderEllipsis: function () {
            if (this.$prevEllipsis.isHidden && this.currentPage > this.config.firstPage + this.config.maxVisiblePages + 1)
                this.$prevEllipsis.show(); else if (!this.$prevEllipsis.isHidden && this.currentPage < this.config.firstPage + this.config.maxVisiblePages + 2)
                this.$prevEllipsis.hide();
            if (this.$nextEllipsis.isHidden && this.currentPage < this.config.lastPage - this.config.maxVisiblePages - 1)
                this.$nextEllipsis.show(); else if (!this.$nextEllipsis.isHidden && this.currentPage > this.config.lastPage - this.config.maxVisiblePages - 2)
                this.$nextEllipsis.hide()
        }, bindClickEvent: function () {
            var self = this;
            this.$container.on('click', 'li', function () {
                if ($(this).data('page') !== undefined) {
                    var requestedPage = self.sanitizePageRequest($(this).data('page'));
                    self.requestPage(requestedPage)
                }
            })
        }, insertNextPaginationComponent: function (pageNumber) {
            if (pageNumber > this.config.firstPage && pageNumber < this.config.lastPage) {
                var $paginationComponent = this.util.createPage(pageNumber);
                return $paginationComponent.insertBefore(this.$nextEllipsis.$elem)
            }
            return $('')
        }, sanitizePageRequest: function (pageData) {
            var requestedPage = this.config.firstPage;
            if (pageData === 'prev') {
                requestedPage = this.currentPage === this.config.firstPage ? this.currentPage : this.currentPage - 1
            } else if (pageData === 'next') {
                requestedPage = this.currentPage === this.config.lastPage ? this.currentPage : this.currentPage + 1
            } else if (!isNaN(pageData) && pageData >= this.config.firstPage && pageData <= this.config.lastPage) {
                requestedPage = parseInt(pageData)
            } else {
                requestedPage = null
            }
            return requestedPage
        }, purgeVisiblePages: function () {
            var size = this.visiblePages.length;
            for (var page = 0; page < size; page += 1)
                this.visiblePages.pop().remove();
        }, parseUrl: function () {
            var requestedPage = this.getUrlParamByName(this.config.urlParameter) || this.config.firstPage;
            return this.sanitizePageRequest(requestedPage)
        }, getUrlParamByName: function (name) {
            name = name.replace(/[\[\]]/g, "\\$&");
            var url = window.location.href;
            var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
            var results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "))
        }, updateUrlParam: function (key, value) {
            let urlQueryString = document.location.search, newParam = key + '=' + value, params = '?' + newParam;
            if (urlQueryString) {
                keyRegex = new RegExp('([\?&])' + key + '[^&]*');
                if (urlQueryString.match(keyRegex) !== null) {
                    params = urlQueryString.replace(keyRegex, "$1" + newParam)
                } else {
                    params = urlQueryString + '&' + newParam
                }
            }
            window.history.pushState('', '', params)
        }, util: {
            createPage: function (pageData) {
                return $('<li>').html('<span>' + pageData + '</span>').addClass('hover-opacity-off opacity button').attr('data-page', pageData)
            }, createChevron: function (type) {
                var direction = type === 'next' ? 'right' : 'left';
                var $icon = $('<i>').addClass('hover-opacity-off opacity material-icons pointer').text('chevron_' + direction);
                return this.createPage(type).text('').attr('data-page', type).append($icon)
            }, Ellipsis: function () {
                var $ellipsis = $('<li>');
                $ellipsis.text('...');
                $ellipsis.addClass('hide button');
                return {
                    $elem: $ellipsis, isHidden: !0, show: function () {
                        this.isHidden = !1;
                        this.$elem.removeClass('hide')
                    }, hide: function () {
                        this.isHidden = !0;
                        this.$elem.addClass('hide')
                    }
                }
            }
        }
    };
    MaterializePagination.defaults = MaterializePagination.prototype.defaults;
    $.fn.materializePagination = function (options) {
        return this.each(function () {
            new MaterializePagination(this, options).init()
        })
    }
})(jQuery, window, document)