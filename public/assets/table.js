var tempoDigitacao = null;

function deleteBadge(id) {
    if (tempoDigitacao)
        clearTimeout(tempoDigitacao);

    let $badge = $("#" + id);
    $badge.css("width", $badge.css("width")).removeClass("padding-small").addClass("padding-4");
    $badge.css("width", 0);
    setTimeout(function () {
        $badge.remove();
    }, 250);
}

$(function () {
    $("#core-content").off("click", ".btn-table-filter").on("click", ".btn-table-filter", function () {
        let grid = grids[$(this).attr("rel")];
        let $filter = grid.$element.find(".table-filter");

        if ($filter.css("height") === "0px") {
            $filter.css("height", "auto");
            let h = $filter.css("height");
            $filter.css("height", 0);
            $filter.css("height", h);
            setTimeout(function () {
                $filter.css("height", "auto");
            }, 300);
        } else {
            $filter.css("height", $filter.css("height"));
            $filter.css("height", 0);
            $filter.find(".table-filter-operator, .table-filter-value, .table-filter-btn").addClass("hide");
            $filter.find(".table-filter-operator").val("");
            $filter.find(".table-filter-value").val("");
        }

        //column filter options
        $filter.find(".table-filter-columns").html("<option disabled='disabled' class='color-text-gray' selected='selected' value=''>coluna...</option>");
        dbLocal.exeRead("__dicionario", 1).then(dicionarios => {
            $.each(dicionarios[grid.entity], function (col, meta) {
                $filter.find(".table-filter-columns").append("<option value='" + col + "' >" + meta.nome + "</option>");
            });
        })

    }).off("change", ".table-filter-columns").on("change", ".table-filter-columns", function () {
        if ($(this).val() !== "") {
            $(this).siblings(".table-filter-operator").removeClass("hide");
        }
    }).off("change", ".table-filter-operator").on("change", ".table-filter-operator", function () {
        if ($(this).val() !== "")
            $(this).siblings(".table-filter-value").removeClass("hide").focus();

    }).off("change keyup", ".table-filter-value").on("change keyup", ".table-filter-value", function (e) {
        if ($(this).val() !== "") {
            if (e.which === 13)
                $(this).siblings(".table-filter-btn").find(".btn-table-filter-apply").trigger("click");
            else
                $(this).siblings(".table-filter-btn").removeClass("hide");
        } else {
            $(this).siblings(".table-filter-btn").addClass("hide");
        }

    }).off("click", ".btn-new-filter").on("click", ".btn-new-filter", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".modal-filter").removeClass("hide");

    }).off("click", ".btn-close-modal").on("click", ".btn-close-modal", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".modal-filter").addClass("hide");

    }).off("click", ".btn-table-filter-apply").on("click", ".btn-table-filter-apply", function () {
        let grid = grids[$(this).attr("rel")];
        let $filter = grid.$element.find(".table-filter");
        let filter = {
            column: $filter.find(".table-filter-columns").val(),
            operator: $filter.find(".table-filter-operator").val(),
            value: $filter.find(".table-filter-value").val(),
            identificador: grid.identificador,
            id: Date.now()
        };

        //covert valores de data no formato correto para comparação no javascript
        let rDataHora = new RegExp("\\d\\d\\/\\d\\d\\/\\d\\d\\d\\d\\s\\d\\d", "i");
        let rData = new RegExp("\\d\\d\\/\\d\\d\\/\\d\\d\\d\\d", "i");
        if(rDataHora.test(filter.value)) {
            let t = filter.value.split(' ');
            let d = t[0].split('/');
            filter.value = d[2] + "-" + d[1] + "-" + d[0] + "T" + t[1];

        } else if(rData.test(filter.value)) {
            let d = filter.value.split('/');
            filter.value = d[2] + "-" + d[1] + "-" + d[0];
        }

        $filter.find(".table-filter-operator, .table-filter-value, .table-filter-btn").addClass("hide");
        $filter.find(".table-filter-columns, .table-filter-operator, .table-filter-value").val("");
        grid.filter.push(filter);
        dbLocal.exeRead('__template', 1).then(templates => {
            return grid.$element.find(".table-filter-list").append(Mustache.render(templates['filter-badge'], filter));
        }).then(d => {
            //close modal
            grid.$element.find(".modal-filter").addClass("hide");
            grid.readData();
        });

    }).off("click", ".grid-order-by").on("click", ".grid-order-by", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".grid-order-by-arrow").remove();

        if (grid.order === $(this).attr("data-column")) {
            grid.orderPosition = !grid.orderPosition;
        } else {
            grid.order = $(this).attr("data-column");
            grid.orderPosition = false;
        }

        if(grid.orderPosition)
            $(this).append("<i class='material-icons grid-order-by-arrow left padding-8'>arrow_drop_up</i>");
        else
            $(this).append("<i class='material-icons grid-order-by-arrow left padding-8'>arrow_drop_down</i>");

        grid.readData();

    }).off("click", ".btn-table-novo").on("click", ".btn-table-novo", function () {
        app.loadView('formulario/' + grids[$(this).attr("rel")].entity)

    }).off("change", ".switch-status-table").on("change", ".switch-status-table", function () {
        let $this = $(this);
        let id = parseInt($this.attr("data-id"));
        let entity = $this.attr("data-entity");
        dbLocal.exeRead(entity, id).then(data => {
            dbLocal.exeRead("__dicionario", 1).then(dicionarios => {
                dbLocal.exeRead('__info', 1).then(info => {
                    $.each(dicionarios[entity], function (col, meta) {
                        if (meta.id === info[entity].status) {
                            data[col] = $this.attr("data-status") === "false";
                            db.exeCreate(entity, data);
                            $this.attr("data-status", data[col]);
                            return !1
                        }
                    })
                });
            });
        })

    }).off("change keyup", ".table-campo-geral").on("change keyup", ".table-campo-geral", function () {
        let $this = $(this);
        if (tempoDigitacao)
            clearTimeout(tempoDigitacao);

        tempoDigitacao = setTimeout(function () {
            let grid = grids[$this.attr("data-id")];
            let valor = $this.val();
            grid.page = 1;

            let achou = false;
            $.each(grid.filter, function (i, e) {
                if (e.operator === "por") {
                    if (valor === "") {
                        deleteBadge(e.id);
                        grid.filter.splice(i, 1);
                        grid.readData();
                    } else if (e.value !== valor) {
                        e.value = valor;
                        $("#" + e.id).find(".value").html(valor);
                        grid.readData();
                    }
                    achou = true;
                    return false;
                }
            });
            if (!achou && valor !== "") {
                let filter = {
                    column: 'busca',
                    operator: "por",
                    value: valor,
                    identificador: grid.identificador,
                    id: Date.now()
                };

                grid.filter.push(filter);
                dbLocal.exeRead('__template', 1).then(templates => {
                    return grid.$element.find(".table-filter-list").append(Mustache.render(templates['filter-badge'], filter));
                }).then(d => {
                    grid.readData();
                });
            }
        }, 350);

    }).off("click", ".btn-badge-remove").on("click", ".btn-badge-remove", function () {
        let grid = grids[$(this).attr("rel")];
        let id = $(this).attr("data-badge");
        let del = -1;
        $.each(grid.filter, function (i, badge) {
            if (typeof badge === "object" && badge.id == id) {
                if (badge.operator === 'por')
                    grid.$element.find(".table-campo-geral").val("");

                del = i;
                return false;
            }
        });
        if (del > -1) {
            deleteBadge(id);
            grid.filter.splice(del, 1);
            grid.readData();
        }

    }).off("change", ".tableLimit").on("change", ".tableLimit", function () {
        let grid = grids[$(this).attr("data-id")];
        localStorage.limitGrid = parseInt($(this).val());
        grid.readDataConfigAltered(localStorage.limitGrid)

    }).off("change", ".table-select-all").on("change", ".table-select-all", function () {
        let grid = grids[$(this).attr("data-id")];
        grid.$content.find(".table-select").prop("checked", $(this).is(":checked"))

    }).off("change", ".table-select").on("change", ".table-select", function () {
        let all = !0;
        let $this = $(this);
        let grid = grids[$this.attr("data-id")];
        $.each(grid.$content.find(".table-select"), function () {
            if (all && $(this).is(":checked") !== $this.is(":checked"))
                all = !1
        });
        grid.$element.find(".table-select-all").prop("checked", (all && $this.is(":checked")))

    }).off("click", ".btn-grid-delete").on("click", ".btn-grid-delete", function () {
        let grid = grids[$(this).attr("data-id")];
        let id = parseInt($(this).attr("rel"));
        var cont = grid.$content.find(".table-select:checked").length;
        cont = (cont === 0 ? 1 : cont);
        if (confirm(cont > 1 ? "Remover os " + cont + " Registros?" : "Remover este Registro? ")) {
            let allDel = [];
            if (cont > 1) {
                $.each(grid.$content.find(".table-select:checked"), function () {
                    allDel.push(db.exeDelete(grid.entity, id))
                })
            } else {
                allDel.push(db.exeDelete(grid.entity, id))
            }
            Promise.all(allDel).then(d => {
                dbLocal.keys(grid.entity).then(registros => {
                    grid.total = registros.length;
                    grid.readDataConfigAltered(grid.limit)
                })
            })
        }
    });
});

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
            this.$container = $('<ul class="bar" style="-webkit-touch-callout: none;-webkit-user-select: none;-khtml-user-select: none;-moz-user-select: none; -ms-user-select: none; user-select: none;">').addClass('pagination').addClass(this.config.align + '-align');
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
            currentPageComponent.addClass('active')
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
            var baseUrl = [location.protocol, '//', location.host, location.pathname].join(''),
                urlQueryString = document.location.search, newParam = key + '=' + value, params = '?' + newParam;
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