var tempoDigitacao = null;

function deleteBadge(id) {
    if (tempoDigitacao)
        clearTimeout(tempoDigitacao);
    let $badge = $("#" + id);
    $badge.css("width", $badge.css("width")).removeClass("padding-small").addClass("padding-4");
    $badge.css("width", 0);
    setTimeout(function () {
        $badge.remove()
    }, 250)
}

function changeAutor(entity, autor, id, valor) {
    return dbLocal.exeRead(entity, id).then(data => {
        data[autor === 2 ? "ownerpub" : "autorpub"] = valor;
        return db.exeCreate(entity, data)
    })
}

function getDataRelation(entity, dados, pretty) {
    return Promise.all([]).then(() => {
        if (dados !== null && dados !== "") {
            let dadosRelation = [];
            if (typeof dados === "object" && dados.constructor === Object) {
                delete dados.id;
                delete dados.columnStatus;
                delete dados.columnName;
                delete dados.columnRelation;
                delete dados.formIdentificador;
                delete dados.columnTituloExtend;
                dadosRelation.push(dados);
            } else {
                $.each(dados, function (i, e) {
                    delete e.id;
                    delete e.columnStatus;
                    delete e.columnName;
                    delete e.columnRelation;
                    delete e.formIdentificador;
                    delete e.columnTituloExtend;
                    dadosRelation.push(e);
                })
            }

            return getDataExtended(entity, dadosRelation, pretty);
        }
    });
}

function getDataExtended(entity, dados, pretty) {
    pretty = typeof pretty !== "undefined" && [!0, "true", "1", 1].indexOf(pretty) > -1;
    let data = [];
    let promessas = [];
    $.each(dados, function (i, e) {
        if (typeof e === "object" && e !== null) {
            delete e.db_action;
            delete e.db_status;

            data.push(e);
            $.each(e, function (j, d) {
                //existe este campo
                if (!isEmpty(dicionarios[entity][j])) {
                    //relação
                    if (dicionarios[entity][j].key === 'relation' && dicionarios[entity][j].format === "list") {
                        //relação de associação
                        delete e[j];
                        if (d !== null && !isNaN(d)) {
                            promessas.push(db.exeRead(dicionarios[entity][j].relation, parseInt(d)).then(dadosRelation => {
                                let dadosRelations = [];
                                dadosRelations.push(dadosRelation);
                                return getDataExtended(dicionarios[entity][j].relation, dadosRelations, pretty).then(ret => {
                                    if (pretty) {
                                        return getDataRelation(dicionarios[entity][j].relation, ret[0], pretty).then(result => {
                                            $.each(result, function (aa, bb) {
                                                $.each(bb, function (bbb, ccc) {
                                                    e[j + " " + bbb] = ccc;
                                                })
                                            });
                                        });
                                    } else {
                                        e[j] = ret[0];
                                    }
                                })
                            }))
                        }

                    } else if (dicionarios[entity][j].key === 'relation' && dicionarios[entity][j].type === "json") {
                        //relação de importação do registro Json format
                        delete e[j];
                        if(d !== null && typeof d === "object" && !isEmpty(d)) {
                            if (pretty) {
                                promessas.push(getDataRelation(dicionarios[entity][j].relation, d, pretty).then(result => {
                                    let moreThanOne = result.length > 1;
                                    $.each(result, function (aa, bb) {
                                        $.each(bb, function (bbb, ccc) {
                                            if (moreThanOne)
                                                e[j + " " + zeroEsquerda(aa + 1) + " " + bbb] = ccc;
                                            else
                                                e[j + " " + bbb] = ccc;
                                        })
                                    });
                                }));
                            } else {
                                let dadosRelations = [];
                                dadosRelations.push(d);
                                promessas.push(getDataExtended(dicionarios[entity][j].relation, dadosRelations, pretty).then(ret => {
                                    e[j] = ret[0]
                                }))
                            }
                        }
                    }
                }
            })
        }
    });
    return Promise.all(promessas).then(() => {
        return data
    })
}

function downloadData(grid, pretty) {
    let offset = (grid.page * grid.limit) - grid.limit;

    toast("Preparando Download...", 1500);
    let ids = [];
    if (grid.$content.find(".table-select:checked").length) {
        $.each(grid.$content.find(".table-select:checked"), function (i, e) {
            $(e).prop("checked", !1);
            ids.push(parseInt($(e).attr("rel")))
        })
    }
    exeRead(grid.entity, grid.filter, grid.order, grid.orderPosition, 10000, offset).then(result => {
        if (result.total > 0) {
            let results = [];
            if (ids.length) {
                $.each(result.data, function (i, e) {
                    if (ids.indexOf(e.id) > -1)
                        results.push(e)
                })
            } else {
                results = result.data
            }
            toast("Processando dados para exportar", 5000);
            getDataExtended(grid.entity, results, pretty).then(dd => {
                toast(results.length + " registros exportados", 3000, "toast-success");
                let d = new Date();
                download(grid.entity + "-" + zeroEsquerda(d.getDate()) + "-" + zeroEsquerda(d.getMonth() + 1) + "-" + d.getFullYear() + ".csv", CSV(dd))
            })
        } else {
            toast("Nenhum registro selecionado", 2000, "toast-warning")
        }
    });
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
                $filter.css("height", "auto")
            }, 300)
        } else {
            $filter.css("height", $filter.css("height"));
            $filter.css("height", 0);
            $filter.find(".table-filter-operator, .table-filter-value, .table-filter-btn").addClass("hide");
            $filter.find(".table-filter-operator").val("");
            $filter.find(".table-filter-value").val("")
        }
        $filter.find(".table-filter-columns").html("<option disabled='disabled' class='color-text-gray' selected='selected' value=''>coluna...</option>");
        $.each(dicionarios[grid.entity], function (col, meta) {
            $filter.find(".table-filter-columns").append("<option value='" + col + "' >" + meta.nome + "</option>")
        })
    }).off("click", ".table-reload").on("click", ".table-reload", function () {
        let grid = grids[$(this).attr("rel")];
        grid.readData()
    }).off("change", ".table-filter-columns").on("change", ".table-filter-columns", function () {
        if ($(this).val() !== "") {
            $(this).siblings(".table-filter-operator").removeClass("hide")
        }
    }).off("change", ".table-filter-operator").on("change", ".table-filter-operator", function () {
        if ($(this).val() !== "")
            $(this).siblings(".table-filter-value").removeClass("hide").focus()
    }).off("change keyup", ".table-filter-value").on("change keyup", ".table-filter-value", function (e) {
        if ($(this).val() !== "") {
            if (e.which === 13)
                $(this).siblings(".table-filter-btn").find(".btn-table-filter-apply").trigger("click"); else $(this).siblings(".table-filter-btn").removeClass("hide")
        } else {
            $(this).siblings(".table-filter-btn").addClass("hide")
        }
    }).off("click", ".btn-new-filter").on("click", ".btn-new-filter", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".modal-filter").removeClass("hide")
    }).off("click", ".btn-close-modal").on("click", ".btn-close-modal", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".modal-filter").addClass("hide")
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
        let rDataHora = new RegExp("\\d\\d\\/\\d\\d\\/\\d\\d\\d\\d\\s\\d\\d", "i");
        let rData = new RegExp("\\d\\d\\/\\d\\d\\/\\d\\d\\d\\d", "i");
        if (rDataHora.test(filter.value)) {
            let t = filter.value.split(' ');
            let d = t[0].split('/');
            filter.value = d[2] + "-" + d[1] + "-" + d[0] + "T" + t[1]
        } else if (rData.test(filter.value)) {
            let d = filter.value.split('/');
            filter.value = d[2] + "-" + d[1] + "-" + d[0]
        }
        $filter.find(".table-filter-operator, .table-filter-value, .table-filter-btn").addClass("hide");
        $filter.find(".table-filter-columns, .table-filter-operator, .table-filter-value").val("");
        grid.filter.push(filter);
        dbLocal.exeRead('__template', 1).then(templates => {
            return grid.$element.find(".table-filter-list").append(Mustache.render(templates['filter-badge'], filter))
        }).then(d => {
            grid.$element.find(".modal-filter").addClass("hide");
            grid.readData()
        })
    }).off("click", ".grid-order-by").on("click", ".grid-order-by", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".grid-order-by-arrow").remove();
        if (grid.order === $(this).attr("data-column")) {
            grid.orderPosition = !grid.orderPosition
        } else {
            grid.order = $(this).attr("data-column");
            grid.orderPosition = !1
        }
        if (grid.orderPosition)
            $(this).append("<i class='material-icons grid-order-by-arrow left padding-8'>arrow_drop_up</i>"); else $(this).append("<i class='material-icons grid-order-by-arrow left padding-8'>arrow_drop_down</i>");
        grid.readData()
    }).off("click", ".btn-grid-sync").on("click", ".btn-grid-sync", function () {
        if (navigator.onLine) {
            let $this = $(this);
            let grid = grids[$this.attr("data-id")];

            if(grid.$content.find(".table-select:checked").length) {
                /**
                 * Checkbox checked, mult sync
                 * */
                if(confirm("Sincronizar os " + grid.$content.find(".table-select:checked").length + " registros selecionados?")) {
                    $.each(grid.$content.find(".table-select:checked"), function (i, e) {
                        $(e).prop("checked", !1);
                        dbRemote.sync(grid.entity, parseInt($(e).attr("rel")), !0).then(() => {
                            grid.readData()
                        })
                    });
                }
            } else {

                /**
                 * Single sync click
                 * */
                dbRemote.sync(grid.entity, parseInt($this.attr("rel")), !0).then(() => {
                    grid.readData()
                })
            }
        } else {
            toast("Sem Conexão", 3000, 'toast-warning')
        }

    }).off("click", ".btn-table-novo").on("click", ".btn-table-novo", function () {
        pageTransition(grids[$(this).attr("rel")].entity, 'form', 'forward', "#dashboard");
    }).off("click", ".btn-table-edit").on("click", ".btn-table-edit", function () {
        pageTransition(grids[$(this).attr("rel")].entity, 'form', 'forward', "#dashboard", {id: $(this).attr("data-id")})
    }).off("change", ".autor-switch-form").on("change", ".autor-switch-form", function () {
        let $this = $(this);
        let valor = $this.val();
        let grid = grids[$this.attr("rel")];
        dbLocal.exeRead("__info", 1).then(info => {
            if (grid.$content.find(".table-select:checked").length > 0) {
                $.each(grid.$content.find(".table-select:checked"), function () {
                    changeAutor(grid.entity, info[grid.entity].autor, parseInt($(this).attr("rel")), valor);
                    grid.$element.find(".autor-switch-form[data-id='" + $(this).attr("rel") + "']").val(valor)
                })
            } else {
                changeAutor(grid.entity, info[grid.entity].autor, parseInt($this.attr("data-id")), valor)
            }
        })
    }).off("change", ".switch-status-table").on("change", ".switch-status-table", function () {
        let $this = $(this);
        let grid = grids[$this.attr("rel")];
        let valor = $this.attr("data-status") === "false";
        dbLocal.exeRead('__info', 1).then(info => {
            $.each(dicionarios[grid.entity], function (column, meta) {
                if (meta.id === info[grid.entity].status) {
                    $this.attr("data-status", valor);
                    let sys = AUTOSYNC;
                    let proccessPromisses = [];
                    AUTOSYNC = !1;
                    dbLocal.exeRead(grid.entity, parseInt($this.attr("data-id"))).then(data => {
                        data[column] = valor ? 1 : 0;
                        proccessPromisses.push(db.exeCreate(grid.entity, data));
                    });
                    if (grid.$content.find(".table-select:checked").length > 0) {
                        $.each(grid.$content.find(".table-select:checked"), function () {
                            let id = parseInt($(this).attr("rel"));
                            let $switch = grid.$element.find(".switch-status-table[data-id='" + id + "']");
                            $switch.attr("data-status", valor).prop("checked", valor)
                            proccessPromisses.push(dbLocal.exeRead(grid.entity, id).then(data => {
                                data[column] = valor ? 1 : 0;
                                return db.exeCreate(grid.entity, data)
                            }));
                        })
                    }

                    return Promise.all(proccessPromisses).then(() => {
                        grid.$element.find(".table-select, .table-select-all").prop("checked", !1);
                        AUTOSYNC = sys;
                        setTimeout(function () {
                            if (AUTOSYNC)
                                dbRemote.syncPost(grid.entity);
                        },300);

                        return !1
                    })

                }
            })
        });

    }).off("change keyup", ".table-campo-geral").on("change keyup", ".table-campo-geral", function () {
        let $this = $(this);
        if (tempoDigitacao)
            clearTimeout(tempoDigitacao);
        tempoDigitacao = setTimeout(function () {
            let grid = grids[$this.attr("data-id")];
            if(typeof grid !== "undefined") {
                let valor = $this.val();
                grid.page = 1;
                let achou = !1;
                $.each(grid.filter, function (i, e) {
                    if (e.operator === "por") {
                        if (valor === "") {
                            deleteBadge(e.id);
                            grid.filter.splice(i, 1);
                            grid.readData()
                        } else if (e.value !== valor) {
                            e.value = valor;
                            $("#" + e.id).find(".value").html(valor);
                            grid.readData()
                        }
                        achou = !0;
                        return !1
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
                        return grid.$element.find(".table-filter-list").append(Mustache.render(templates['filter-badge'], filter))
                    }).then(d => {
                        grid.readData()
                    })
                }
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
                return !1
            }
        });
        if (del > -1) {
            deleteBadge(id);
            grid.filter.splice(del, 1);
            grid.readData()
        }
    }).off("change", ".tableLimit").on("change", ".tableLimit", function () {
        let grid = grids[$(this).attr("data-id")];
        localStorage.limitGrid = parseInt($(this).val());
        grid.readDataConfigAltered(localStorage.limitGrid)
    }).off("change", ".table-select-all").on("change", ".table-select-all", function () {
        let grid = grids[$(this).attr("data-id")];
        grid.$content.find(".table-select").prop("checked", $(this).is(":checked"))

    }).off("click", ".table-select").on("click", ".table-select", function (evt) {
        let all = !0;
        let $this = $(this);
        let grid = grids[$this.attr("data-id")];
        let action = $this.is(":checked");

        /**
         * Ctrl ou Shift pressionado, seleciona os checkbox no intervalo
         * */
        if((evt.ctrlKey || evt.shiftKey) && grid.$content.find(".table-select:checked").length > 1) {
            let first = grid.$content.find(".table-select").index(grid.$content.find(".table-select:checked").first());
            let last = grid.$content.find(".table-select").index($this);

            if(action) {
                for (let i = first + 1; i < last; i++)
                    grid.$content.find(".table-select:eq(" + i + ")").prop("checked", !0);
            } else {
                for (let i = last + 1; i < grid.$content.find(".table-select").length; i++)
                    grid.$content.find(".table-select:eq(" + i + ")").prop("checked", !1);
            }
        }

        /**
         * Verifica se todos foram marcados para marcar a caixa de todos, e vice-versa
         * */
        $.each(grid.$content.find(".table-select"), function () {
            if (all && $(this).is(":checked") !== $this.is(":checked"))
                all = !1
        });
        grid.$element.find(".table-select-all").prop("checked", (all && $this.is(":checked")));

    }).off("click", ".btn-grid-delete").on("click", ".btn-grid-delete", function () {
        let grid = grids[$(this).attr("data-id")];
        var cont = grid.$content.find(".table-select:checked").length;
        if (confirm(cont > 1 ? "Remover os " + cont + " Registros?" : "Remover este Registro? ")) {
            toast("Requisitando remoção...", 15000);
            let ids = [];
            if (cont > 0) {
                $.each(grid.$content.find(".table-select:checked"), function () {
                    ids.push(parseInt($(this).attr("rel")))
                })
            } else {
                ids.push(parseInt($(this).attr("rel")))
            }
            grid.$element.find(".table-select, .table-select-all").prop("checked", !1);
            db.exeDelete(grid.entity, ids).then(() => {
                toast("Registros excluídos", 1500, "toast-success");
                dbLocal.keys(grid.entity).then(registros => {
                    grid.total = registros.length;
                    grid.readDataConfigAltered(grid.limit)
                })
            })
        }

    }).off("click", "#export-file-crud").on("click", "#export-file-crud", function () {
        let grid = grids[$(this).attr("rel")];
        downloadData(grid, !1);

    }).off("click", "#download-file-crud").on("click", "#download-file-crud", function () {
        let grid = grids[$(this).attr("rel")];
        downloadData(grid, !0);

    }).off("change", "#import-file-crud").on("change", "#import-file-crud", function() {
        toast("Enviando Arquivo...", 60000);
        let input = $(this);
        let grid = grids[input.attr("rel")];
        readFile(input.prop('files')[0]).then(d => {
            let upload = [];
            let erros = [];
            d = d.split('\n');
            if (d.length > 1) {
                let base = [];
                $.each(d, function (i, row) {
                    if (!isEmpty(row)) {
                        let registro = {};
                        $.each(row.split(";"), function (ii, col) {
                            if (i === 0) {
                                base.pushTo(col.replace(/<:::>/g, ";"), ii)
                            } else {
                                registro[base[ii]] = col.replace(/<:::>/g, ";");
                            }
                        });
                        if (!isEmpty(registro)) {
                            let form = formCrud(grid.entity);
                            form.setData(registro);
                            upload.push(validateDicionario(dicionarios[grid.entity], form, "create").then(d => {
                                if (formNotHaveError(form.error))
                                    return db.exeCreate(grid.entity, form.data); else erros.push(form.error)
                            }))
                        }
                    }
                })
            }
            Promise.all(upload).then(() => {
                grid.reload();
                if (erros.length) {
                    toast(erros.length + " registros não importados devido a erros.", 3500, "toast-warning");
                    console.log(erros)
                } else {
                    toast(upload.length + " registros importados com sucesso", 3500, "toast-success");
                }
            })
        });
    })
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