var grids = [];

async function permissionToChange(entity, data) {
    if (USER.setor === "admin")
        return true;

    let info = JSON.parse(sessionStorage.__info);

    if(typeof info[entity] === "object" && info[entity] !== null) {

        /**
         * Sistema diferente do usuário
         * */
        if (isNumberPositive(data.system_id) && data.system_id != USER.system_id) {
            if(typeof info[entity].system === "string" && !isEmpty(info[entity].system) && !isEmpty(info[info[entity].system].system) && info[info[entity].system].system === info[USER.setor].system) {
                let r = await db.exeRead(info[entity].system, data.system_id);
                return (!isEmpty(r) && r[0].system_id == USER.system_id);
            } else {
                return !1;
            }
        }

        /**
         * Sistema administrativo, usuário não tem permissão para editar
         * */
        if((!isNumberPositive(data.system_id) || isEmpty(data.system_id)) && typeof info[entity].system === "string" && !isEmpty(info[entity].system) && !isEmpty(data.id))
            return false;

        /**
         * Autorpub check permission
         * */
        if (typeof info[entity].autor === "number" && info[entity].autor === 1 && isNumberPositive(data.id)) {
            let dados = await db.exeRead(entity, data.id);
            if(!isEmpty(dados) && typeof dados[0].autorpub === "number" && parseInt(dados[0].autorpub) !== parseInt(USER.id))
                return false;
        }

        /**
         * Ownerpub check permission
         * */
        if (typeof info[entity].autor === "number" && info[entity].autor === 2 && isNumberPositive(data.id)) {
            let dados = await db.exeRead(entity, data.id);
            if(!isEmpty(dados) && typeof dados[0].ownerpub === "number" && parseInt(dados[0].ownerpub) !== parseInt(USER.id))
                return false;
        }
    }

    return true;
}

async function permissionToAction(entity, action) {
    return USER.setor === "admin" || await AJAX.get("permissionTo/" + entity + "/" + action);
}

async function gridTr(identificador, entity, data, fields, info, actions, selecteds) {

    let gridContent = {
        id: data.id || 0,
        db_status: (typeof data.db_status !== "boolean" || data.db_status),
        online: navigator.onLine,
        identificador: identificador,
        entity: entity,
        fields: [],
        permission: await permissionToChange(entity, data),
        button: {
            delete: (actions['delete'] ? await permissionToAction(entity, 'delete') : !1),
            update: (actions.update ? await permissionToAction(entity, 'update') : !1),
            status: {have: !1, status: !1}
        }
    };

    /**
     * Button status show or not
     */
    if (actions.status && gridContent.button.update && isNumberPositive(info.status)) {
        gridContent.button.status.have = !0;

        for(let m in dicionarios[entity]) {
            let meta = dicionarios[entity][m];
            if (meta.id === info.status) {
                if (meta.update && meta.datagrid !== !1)
                    gridContent.button.status.status = (data[meta.column] === "true" || data[meta.column] === !0 || data[meta.column] === 1 || data[meta.column] === "1");
                else
                    gridContent.button.status.have = !1;

                break;
            }
        }
    }

    for(let e of fields) {
        if (typeof data[e.column] !== "undefined") {
            let tr = {
                id: data.id,
                show: e.show,
                column: e.column,
                entity: gridContent.entity,
                style: '',
                class: '',
                checked: e.first && selecteds.indexOf(parseInt(data.id)) > -1,
                first: e.first
            };
            tr.class = getTrClass(dicionarios[entity][e.column], data[e.column]);
            tr.style = getTrStyle(dicionarios[entity][e.column], data[e.column]);
            tr.value = await gridTdFilterValue(data[e.column], data['relationData'] ?? [], dicionarios[entity][e.column]);
            gridContent.fields.push(tr);
        }
    }

    return gridContent
}

async function getFields(entity, haveId, type) {
    if (isOnline() && typeof type === "string") {
        let rec = await AJAX.get("recoveryFieldsCustom/" + type + "/" + entity);
        if (!isEmpty(rec)) {
            for (let r of rec) {
                r.show = r.show === "true";
                r.first = r.first === "true"
            }
            return rec
        }
    }

    haveId = haveId || !1;

    let relevants = await dbLocal.exeRead("__relevant", 1);
    let relation = JSON.parse(sessionStorage.__general);
    let info = JSON.parse(sessionStorage.__info);

    return getFieldsData(entity, haveId, [relevants, relation, info])
}

function getFieldsData(entity, haveId, r) {
    let fields = ["", "", "", "", "", "", ""];
    let relevants = r[0];
    let relation = r[1][entity];
    let indices = [];
    if (haveId) {
        let data = {
            'nome': "ID",
            'column': 'id',
            'show': !0,
            'class': "",
            'style': "",
            'template': "",
            'format': "number",
            'relation': null,
            'first': !0
        };
        pushToArrayIndex(fields, data, 0);
        indices.push(0)
    }

    function getIndiceField(indice, indices) {
        if (indices.indexOf(indice) > -1)
            return getIndiceField((indice + 1), indices);
        return indice
    }

    $.each(dicionarios[entity], function (i, e) {
        if (!isEmpty(e.datagrid) && !isEmpty(e.datagrid.grid_relevant)) {
            let data = {
                'nome': e.nome,
                'column': e.column,
                'show': !0,
                'class': e.datagrid.grid_class || "",
                'style': e.datagrid.grid_style || "",
                'template': e.datagrid.grid_template || "",
                'format': e.format,
                'relation': e.relation || null,
                'first': !haveId && e.datagrid.grid_relevant === 1
            };
            let indice = getIndiceField(e.datagrid.grid_relevant - 1, indices);
            indices.push(indice);
            pushToArrayIndex(fields, data, indice);
        }
    });

    if (!isEmpty(relation) && typeof relation === "object" && !isEmpty(relation.belongsTo)) {
        $.each(relation.belongsTo, function (i, e) {
            $.each(e, function (relEntity, relData) {
                if (!isEmpty(relData.datagrid) && isEmpty(fields[relData.datagrid - 1])) {
                    let data = {
                        'nome': ucFirst(replaceAll(replaceAll(relEntity, "_", " "), "-", " ")),
                        'column': relData.column,
                        'show': !0,
                        'class': relData.grid_class_relational || "",
                        'style': relData.grid_style_relational || "",
                        'template': relData.grid_template_relational || "",
                        'format': 'text',
                        'relation': relEntity,
                        'first': !haveId && relData.datagrid === 1
                    };
                    let indice = getIndiceField(relData.datagrid - 1, indices);
                    indices.push(indice);
                    pushToArrayIndex(fields, data, indice)
                }
            })
        })
    }

    if (!isEmpty(relevants)) {
        for (let a = 0; a < 6; a++) {
            if (isEmpty(fields[a])) {
                $.each(dicionarios[entity], function (i, e) {
                    if (allowThisType(e, fields)) {
                        let data = {
                            'nome': e.nome,
                            'column': e.column,
                            'show': e.datagrid !== !1 && relevants.indexOf(e.format) > -1,
                            'class': e.datagrid.grid_class || "",
                            'style': e.datagrid.grid_style || "",
                            'template': e.datagrid.grid_template || "",
                            'format': e.format,
                            'relation': e.relation || null,
                            'first': !haveId && a === 0
                        };
                        let indice = getIndiceField(a, indices);
                        if (indice < 7) {
                            indices.push(indice);
                            pushToArrayIndex(fields, data, indice)
                        }
                    }
                })
            }
        }
    }

    /**
     * Preenche campos restantes para disponibilizar visualização por controle na tabela
     */
    $.each(dicionarios[entity], function (i, e) {
        if (allowThisType(e, fields)) {
            let data = {
                'nome': e.nome,
                'column': e.column,
                'show': !1,
                'class': e.datagrid.grid_class || "",
                'style': e.datagrid.grid_style || "",
                'template': e.datagrid.grid_template || "",
                'format': e.format,
                'relation': e.relation || null,
                'first': !1
            };
            let indice = getIndiceField(0, indices);
            indices.push(indice);
            pushToArrayIndex(fields, data, indice)
        }
    })

    let fieldsReturn = fields.filter(function (data) {
        if (!isEmpty(data))
            return data
    });

    AJAX.post("saveFieldsGrid", {type: "grid", entity: entity, fields: fieldsReturn}).catch(() => {});

    return fieldsReturn;
}

function getTrStyle(meta, value) {
    if (typeof meta !== "undefined") {
        let style = meta.datagrid.grid_style;
        if (meta.key === "source" && meta.size == 1 && value !== null && typeof value === "object" && typeof value[0] === "object" && typeof value[0].fileType === "string" && /^image\//.test(value[0].fileType)) {
            style += "background-image: url(" + value[0].image + ");"
        }
        return style
    }
    return ""
}

function getTrClass(meta, value) {
    if (typeof meta !== "undefined") {
        let classe = 'td-' + meta.format + " " + meta.datagrid.grid_class;
        if (meta.key === "source" && meta.size == 1 && value !== null && typeof value === "object" && typeof value[0] === "object" && typeof value[0].fileType === "string" && /^image\//.test(value[0].fileType)) {
            classe += " tableImgTd"
        }
        return classe
    }
    return ""
}

async function gridTdFilterValue(value, relationData, meta) {
    if (typeof meta === "undefined")
        return value;

    value = !isEmpty(value) ? value : "";
    if (['select', 'radio'].indexOf(meta.format) > -1) {
        let allows = meta.allow.options.find(option => option.valor == value);
        if(typeof allows === "object" && typeof allows.representacao !== "undefined")
            return allows.representacao;

    } else if ('percent' === meta.format) {
        return value;

    } else if ('checkbox' === meta.format) {
        let resposta = "";
        for (let i in meta.allow.options)
            resposta += (value.indexOf(meta.allow.options[i].valor.toString()) > -1 ? ((resposta !== "" ? ", " : "") + (!isEmpty(meta.allow.options[i]) ? meta.allow.options[i].representacao : "")) : "");

        return resposta;

    } else if (meta.group === "boolean") {
        return "<div class='activeBoolean" + (value == 1 ? " active" : "") + "'></div>";

    } else if (meta.key === "valor") {
        return "R$ " + formatMoney(value, 2, ',', '.');

    } else if (meta.type === "float" || meta.type === "decimal") {
        return !isEmpty(value) ? formatMoney(value, 2, ',', '.') : 0;

    } else if ('folder' === meta.format) {
        return !isEmpty(value) ? value.columnTituloExtend : "";

    } else if ('extend_folder' === meta.format) {
        if(isEmpty(value) || typeof value !== "object" || value === null)
            return "";

        let valueFinal = "";

        if(typeof value === "object") {
            if(typeof value.columnTituloExtend === "string") {
                valueFinal = value.columnTituloExtend;
            } else if(typeof value[0] !== "undefined" && typeof value[0].columnTituloExtend === "string") {
                for(let vv of value)
                    valueFinal += vv.columnTituloExtend;
            }
        }

        return valueFinal;

    } else if ('list' === meta.format) {
        return !isEmpty(relationData[meta.column]) ? getRelevantTitle(meta.relation, relationData[meta.column], 1, false) : "";

    } else if ('list_mult' === meta.format) {
        if(isEmpty(relationData[meta.column]))
            return "";

        let valueFinal = "";
        for(let e of relationData[meta.column])
            valueFinal += (await getRelevantTitle(meta.relation, e, 1, true));

        return valueFinal;

    } else {
        if (!isEmpty(meta.allow.options) && meta.key !== 'source') {
            $.each(meta.allow.options, function (i, e) {
                if (e.option == value) {
                    value = e.name;
                    return !1
                }
            })
        }
        else if (meta.format === 'date') {
            if (/-/.test(value)) {
                let v = value.split('-');
                value = v[2] + "/" + v[1] + "/" + v[0]
            }
        } else if (meta.format === 'datetime') {
            if (/T/.test(value)) {
                let b = value.split('T');
                let v = b[0].split('-');
                value = v[2] + "/" + v[1] + "/" + v[0] + " " + b[1]
            } else if (/ /.test(value)) {
                let b = value.split(' ');
                let v = b[0].split('-');
                value = v[2] + "/" + v[1] + "/" + v[0] + " " + b[1]
            }
        } else if (meta.key === 'source') {
            if (meta.key === "source" && meta.size == 1 && value !== null && typeof value === "object" && typeof value[0] === "object" && typeof value[0].fileType === "string" && /^image\//.test(value[0].fileType)) {
                value = ""
            } else {
                value = "<svg class='icon svgIcon' ><use xlink:href='#file'></use></svg>"
            }
        }
        return value
    }
}

function reverse(s) {
    if (typeof s === "string")
        return s.split("").reverse().join("");
    return ""
}

function separaNumeroValor(val, charact) {
    charact = charact || " ";
    val = reverse(val);
    return reverse(val.substring(0, 3) + (val.substring(3, 6) !== "" ? charact + val.substring(3, 6) : "") + (val.substring(6, 9) !== "" ? charact + val.substring(6, 9) : "") + (val.substring(9, 12) !== "" ? charact + val.substring(9, 12) : "") + (val.substring(12, 15) !== "" ? charact + val.substring(12, 15) : "") + (val.substring(15, 18) !== "" ? charact + val.substring(15, 18) : ""))
}

function checkUserOptionsTable() {
    $("." + USER.setor + "Show").removeClass("hide");
    $("." + USER.setor + "Hide").addClass("hide");
    $("." + USER.setor + "Allow").removeAttr("disabled");
    $("." + USER.setor + "Disabled").attr("disabled", "disabled");
}

function clearForm() {
    $("#app").off("click", ".btn-form-list").on("click", ".btn-form-list", function () {
        form.setReloadAfterSave(!1);
        form.save(0).then(() => {
            animateBack("#dashboard").grid(form.entity)
        })
    }).off("click", ".btn-form-save").on("click", ".btn-form-save", function () {
        form.save()
    });
    checkUserOptionsTable()
}

var syncGrid = null;

function gridCrud(entity, fields, actions) {
    let identificador = Math.floor((Math.random() * 1000)) + "" + Date.now();
    if (typeof actions === "object" && !isEmpty(actions)) {
        actions = {
            autor: typeof actions.autor !== "undefined" ? actions.autor : !1,
            create: typeof actions.create !== "undefined" ? actions.create : !0,
            update: typeof actions.update !== "undefined" ? actions.update : !0,
            delete: typeof actions['delete'] !== "undefined" ? actions['delete'] : !0,
            status: typeof actions.status !== "undefined" ? actions.status : !0,
        }
    }

    grids = [];
    let grid = grids[identificador] = {
        identificador: identificador,
        entity: entity,
        data: {},
        $element: "",
        $content: "",
        total: 0,
        limit: localStorage.limitGrid ? parseInt(localStorage.limitGrid) : 15,
        page: 1,
        order: 'id',
        orderPosition: !0,
        search: "",
        filter: [],
        filterGroupIndex: 0,
        filterRegraIndex: 0,
        filterOperador: "",
        filterRegraOperador: "",
        $filterGroup: null,
        filterAggroup: "",
        filterAggroupSum: [],
        filterAggroupMedia: [],
        filterAggroupMaior: [],
        filterAggroupMenor: [],
        filterTotal: -1,
        loadingActive: false,
        loadingTimer: null,
        loadingHtml: "",
        actions: actions || {autor: !1, create: !0, update: !0, delete: !0, status: !0},
        fields: fields || [],
        goodName: function () {
            return function (text, render) {
                return ucFirst(replaceAll(replaceAll(render(text), "_", " "), "-", " "))
            }
        },
        putWaitingRegisters: function (registerPosition, registersWaitingPosition, $content) {
            if (registersWaitingPosition.length) {
                for (let i in registersWaitingPosition) {
                    if (registersWaitingPosition[i].position === registerPosition) {
                        $content.append(registersWaitingPosition[i].content);
                        registerPosition++;
                        registersWaitingPosition.splice(i, 1);
                        return this.putWaitingRegisters(registerPosition, registersWaitingPosition, $content);
                    }
                }
            }

            return [registerPosition, registersWaitingPosition];
        },
        applyFilters: function () {
            let $this = this;
            $this.readData()
        },
        loading: function() {
            let $this = this;
            if(!$this.$element.find(".tr-loading").length) {
                $this.loadingActive = true;
                $this.$element.find(".table-all").css("opacity", ".5");
                $this.loadingHtml = $("<div class='col tr-loading' style='position: relative;height: 4px;'></div>").insertBefore($this.$element.find(".table-all"));
                $this.loadingHtml.loading();
                $this.loadingTimer = setInterval(function () {
                    $this.loadingHtml.loading()
                }, 2000);
            }
        },
        clearLoading: function() {
            this.loadingActive = false;
            this.loadingHtml.remove();
            this.$element.find(".table-all").css("opacity", 1);
            clearInterval(this.loadingTimer);
        },
        updateTotalTable: async function() {
            let $this = this;
            $this.total = await AJAX.get("totalRegistros/" + $this.entity);
            let total = $this.total.toString();
            let totalFormated = "";
            let le = total.length;
            for (let i = 0; i < le; i++)
                totalFormated += (i > 0 && (le - i) % 3 === 0 ? "." : "") + total[i];

            $this.$element.find(".total").html(totalFormated + " registro" + ($this.total > 1 ? "s" : ""));
        },
        readData: async function () {
            let $this = this;

            while ($this.loadingActive)
                await sleep(50);

            $this.loading();
            $this.$content = $this.$element.find("tbody");

            /**
             * Get data results
             */
            let offset = ($this.page * $this.limit) - $this.limit;
            let result = await reportRead(entity, !isEmpty($this.search) ? $this.search : null, $this.filter, $this.filterAggroup, $this.filterAggroupSum, $this.filterAggroupMedia, $this.filterAggroupMaior, $this.filterAggroupMenor, $this.order, $this.orderPosition, $this.limit, offset);
            let info = JSON.parse(sessionStorage.__info);
            let templates = getTemplates();

            let selecteds = [];
            if ($this.$content.find(".table-select:checked").length > 0) {
                $.each($this.$content.find(".table-select:checked"), function (i, e) {
                    selecteds.push(parseInt($(this).attr("rel")))
                })
            }

            $(".table-info-result").remove();
            $this.$content.parent().find("thead").removeClass("hide");

            if (typeof info !== "undefined") {
                $this.filterTotal = -1;
                let pp = [];
                let registerPosition = 0;
                let registersWaitingPosition = [];
                $this.$content.html("");

                for (let k in result) {
                    if (typeof result[k] === "object" && !isEmpty(result[k])) {
                        pp.push(gridTr($this.identificador, entity, result[k], $this.fields, info[entity], grid.actions, selecteds).then(tr => {
                            if (parseInt(k) === registerPosition) {
                                $this.$content.append(Mustache.render(templates.grid_content, tr))
                                registerPosition++;
                                if (registersWaitingPosition.length) {
                                    let r = $this.putWaitingRegisters(registerPosition, registersWaitingPosition, $this.$content);
                                    registerPosition = r[0];
                                    registersWaitingPosition = r[1];
                                }
                            } else {
                                registersWaitingPosition.push({
                                    position: parseInt(k),
                                    content: Mustache.render(templates.grid_content, tr)
                                });
                            }
                        }))
                    }
                }
                return Promise.all(pp).then(d => {
                    if (isEmpty(d)) {
                        $this.$content.parent().find("thead").addClass("hide");
                        $this.$content.parent().after(Mustache.render(templates.no_registers));
                    }
                    $this.clearLoading();
                    $this.posData()
                })
            } else {
                $this.clearLoading();
            }
        },
        readDataConfigAltered: function (limit) {
            let grid = this;
            let offset = (grid.page * grid.limit) - grid.limit;
            offset = offset >= grid.total ? grid.total - grid.limit : offset;
            grid.limit = parseInt(limit);
            if (offset >= grid.limit) {
                grid.page = 1 + Math.floor(offset / grid.limit)
            } else {
                grid.page = 1
            }
            this.readData()
        },
        getShow: async function () {
            if (isEmpty(grid.fields))
                this.fields = await getFields(entity, true, 'grid');

            if (!(await permissionToAction(this.entity, 'read')))
                return "<h2 class='align-center padding-32 color-text-gray-dark'>Sem Permissao para Ler esses dados</h2>";

            if (!localStorage.limitGrid)
                localStorage.limitGrid = 15;

            if (this.actions.create)
                this.actions.create = await permissionToAction(this.entity, 'create');

            return Mustache.render(getTemplates().grid, {
                entity: entity,
                home: HOME,
                limits: {
                    a: this.limit === 15,
                    b: this.limit === 25,
                    c: this.limit === 50,
                    d: this.limit === 100,
                    e: this.limit === 250,
                    f: this.limit === 500,
                    g: this.limit === 1000
                },
                novo: this.actions.create,
                identificador: this.identificador,
                goodName: this.goodName,
                fields: this.fields
            });
        },
        show: function ($element) {
            if (typeof $element !== "undefined")
                this.$element = $element;

            if (typeof this.$element !== "undefined") {
                this.$element.find(".grid-control").remove();
                return this.getShow().then(data => {
                    this.$element.html(data);
                    return this.readData()
                })
            }
        },
        posData: async function () {
            let $this = this;
            maskData($this.$content)
            clearForm();

            await $this.updateTotalTable();

            $this.$element.find(".pagination").remove();
            let total = parseInt($this.total);
            if ($this.total > $this.limit) {
                $this.$element.find(".grid-form-body").materializePagination({
                    currentPage: $this.page,
                    lastPage: Math.ceil(total / $this.limit),
                    onClickCallback: function (requestedPage) {
                        if (requestedPage !== $this.page) {
                            $this.page = requestedPage;
                            $this.readData()
                        }
                    }
                })
            }

            /**
             * Add filter option if is admin
             */
            if(USER.setor === "admin") {
                let $sum = $this.$element.find(".sum-aggroup");
                if (!$this.$element.find(".aggroup").find("option").length) {
                    let $aggroup = $this.$element.find(".aggroup").html("<option value='' selected='selected'>agrupar por...</option>");

                    for (let col in dicionarios[$this.entity]) {
                        $aggroup.append("<option value='" + col + "'>" + (col === "system_id" ? "Sistema" : dicionarios[$this.entity][col].nome) + "</option>");

                        if (["identifier", "information", "publisher"].indexOf(dicionarios[$this.entity][col].key) === -1)
                            $sum.append("<div class='left relative padding-right' style='margin-top: -5px'><select class='theme-text-aux aggreted-field-type' data-rel='" + identificador + "' rel='" + col + "'><option value='' class='theme-text'>" + dicionarios[$this.entity][col].nome + "</option><option value='soma' class='theme-text'>soma</option><option value='media' class='theme-text'>média</option><option value='maior' class='theme-text'>maior</option><option value='menor' class='theme-text'>menor</option></select></div>");
                    }
                }

                $this.$element.find(".btn-table-filter").removeClass("hide");
            }
        },
        reload: function () {
            this.readData();
        },
        destroy: function () {
            clearInterval(syncGrid);
            this.$element.html("");
            delete (grids[this.identificador])
        }
    };
    return grid
}

function deleteBadge(id, identificador) {
    if (tempoDigitacao)
        clearTimeout(tempoDigitacao);
    let $badge = $("#" + id);
    $badge.css("width", $badge.css("width")).removeClass("padding-small").addClass("padding-4");
    $badge.css("width", 0);
    setTimeout(function () {
        let $filter = $badge.closest(".filter-logic");
        let $filterParent = $filter.closest("#filter-logic");
        if ($filter.find(".filter_badge").length === 1) {
            if ($filter.prev(".inner_div").length)
                $filter.prev(".inner_div").remove();

            $filter.remove();
            if ($filterParent.find(".filter-logic").length) {
                $(".btn-new-group[rel='" + identificador + "']").removeClass("disabled").removeAttr("disabled");
            } else {
                $(".btn-new-group[rel='" + identificador + "']").addClass("disabled").attr("disabled", "disabled");
                $(".btn-new-group[data-rel='group'][rel='" + identificador + "']").removeClass("disabled").removeAttr("disabled");
            }
        }

        $badge.remove();
    }, 250)
}

$(function ($) {
    $.fn.grid = function (entity, fields, actions) {
        let $this = this;
        let grid = gridCrud(entity, fields, actions);
        grid.show($this).then(() => {
            app.removeLoading($this);
        })
        return $this
    }
}, jQuery);

$(function () {
    $("#app").off("click", ".btn-table-filter").on("click", ".btn-table-filter", function () {
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
            $filter.find(".table-filter-columns").append("<option value='" + col + "' >" + (col === "system_id" ? "Sistema" : meta.nome) + "</option>")
        })
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
    }).off("click", ".btn-close-modal").on("click", ".btn-close-modal", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".modal-filter, .modal-grafico").addClass("hide");

    }).off("click", ".btn-group-remove").on("click", ".btn-group-remove", function () {
        let identificador = $(this).attr("rel");
        let $filter = $(this).closest(".filter-logic");
        let $filterParent = $filter.closest("#filter-logic");
        if ($filter.prev(".inner_div").length)
            $filter.prev(".inner_div").remove();
        $filter.remove();

        if ($filterParent.find(".filter-logic").length) {
            $(".btn-new-group[rel='" + identificador + "']").removeClass("disabled").removeAttr("disabled");
        } else {
            $(".btn-new-group[rel='" + identificador + "']").addClass("disabled").attr("disabled", "disabled");
            $(".btn-new-group[data-rel='group'][rel='" + identificador + "']").removeClass("disabled").removeAttr("disabled");
        }

    }).off("click", ".btn-new-group").on("click", ".btn-new-group", function () {
        let identificador = $(this).attr("rel");
        let grid = grids[identificador];
        grid.filterRegraOperador = $(this).attr("data-rel");
        let nameRegra = (grid.filterRegraOperador === "inner_join" ? "grupo de inclusão" : "grupo de exclusão");
        let $logic = grid.$element.find("#filter-logic");
        grid.$element.find(".btn-new-group").addClass("disabled").attr("disabled", "disabled");
        let tpl = getTemplates();
        if (grid.filterRegraOperador !== "group") {
            let $grupoFieldDic = $("<div class='col inner_div'><hr class='col'><div class='left font-small' style='margin: -15px 0 4px 5px'>" + nameRegra + "</div><div class='left font-small grupo-join-field' style='margin: -24px 0 4px 5px;'></div></div>").appendTo($logic);
            let $grupoField = $("<select class='theme-text-aux grupo-join-field-select' rel='" + identificador + "'><option value='id' class='theme-text'>id</option></select>").appendTo($grupoFieldDic.find(".grupo-join-field"));

            for(let i in dicionarios[grid.entity])
                $grupoField.append("<option value='" + i + "' class='theme-text'>" + dicionarios[grid.entity][i].nome + "</option>")
        }
        $logic.append(Mustache.render(tpl.filter_group, {identificador: identificador}));

    }).off("click", ".btn-new-filter-and").on("click", ".btn-new-filter-and", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$filterGroup = $(this).closest(".filter-logic");
        grid.filterOperador = "e";
        grid.filterGroupIndex = 0;
        grid.filterRegraIndex = 0;

        let findGroupIndex = !0;
        grid.$filterGroup.prevAll().each(function (i, e) {
            if ($(e).hasClass("inner_div")) {
                grid.filterRegraIndex++;
                findGroupIndex = !1;
            }

            if (findGroupIndex)
                grid.filterGroupIndex++;
        });

        grid.$element.find(".modal-filter").removeClass("hide");

    }).off("click", ".btn-new-filter-or").on("click", ".btn-new-filter-or", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$filterGroup = $(this).closest(".filter-logic");
        grid.filterOperador = "ou";
        grid.filterGroupIndex = 0;
        grid.filterRegraIndex = 0;

        let findGroupIndex = !0;
        grid.$filterGroup.prevAll().each(function (i, e) {
            if ($(e).hasClass("inner_div")) {
                grid.filterRegraIndex++;
                findGroupIndex = !1;
            }

            if (findGroupIndex)
                grid.filterGroupIndex++;
        });

        grid.$element.find(".modal-filter").removeClass("hide");

    }).off("click", ".btn-table-filter-apply").on("click", ".btn-table-filter-apply", function () {
        let grid = grids[$(this).attr("rel")];
        let operador = grid.filterOperador;
        let $filter = grid.$element.find(".table-filter");

        /**
         * visualização dos botões de grupo e join
         */
        grid.$element.find(".btn-new-group").removeClass("disabled").removeAttr("disabled");
        grid.$filterGroup.find(".btn-group-remove").remove();

        /**
         * Cria dados do novo filtro
         */
        let title = grid.filterOperador + " => " + $filter.find(".table-filter-columns").last().val() + " " + $filter.find(".table-filter-operator").val() + " " + $filter.find(".table-filter-value").val();
        let filter = {
            logica: grid.filterOperador === "e" ? "and" : "or",
            coluna: $filter.find(".table-filter-columns").last().val(),
            colunas: [],
            operador: $filter.find(".table-filter-operator").val(),
            valor: $filter.find(".table-filter-value").val(),
            entidades: [],
            identificador: grid.identificador,
            id: Date.now() + Math.floor((Math.random() * 1000)),
            columnTituloExtend: "<small class='color-gray left opacity padding-tiny radius'>regra</small><span style='padding: 1px 5px' class='left padding-right font-medium td-title'> " + title + "</span>",
            columnName: 'filtros',
            columnRelation: 'relatorios_filtro',
            columnStatus: {column: '', have: !1, value: !1}
        };

        $filter.find(".table-filter-columns").each(function (i, e) {
            filter.colunas.push($(e).val());
            filter.entidades.push($(e).data("entity"));
        });
        filter.colunas = JSON.stringify(filter.colunas);
        filter.entidades = JSON.stringify(filter.entidades);

        /**
         * Conversão de data no formato dd/mm/YY
         */
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

        /**
         * Adiciona filtro a lista de filtros no controller
         */
        if (grid.filterRegraOperador !== "group") {
            grid.filter.push({
                tipo: grid.filterRegraOperador,
                tipoColumn: grid.$filterGroup.prevAll(".inner_div").first().find(".grupo-join-field-select").val(),
                grupos: [],
                identificador: grid.identificador,
                id: Date.now() + Math.floor((Math.random() * 1000)),
                columnTituloExtend: "<small class='color-gray left opacity padding-tiny radius'>tipo</small><span style='padding: 1px 5px' class='left padding-right font-medium td-title'> " + grid.filterRegraOperador + "</span>",
                columnName: 'regras',
                columnRelation: 'relatorios_regras',
                columnStatus: {column: '', have: !1, value: !1}
            });
            grid.filterRegraOperador = "group";
        } else if (isEmpty(grid.filter)) {
            grid.filter.push({
                tipo: 'select',
                tipoColumn: "",
                grupos: [],
                identificador: grid.identificador,
                id: Date.now() + Math.floor((Math.random() * 1000)),
                columnTituloExtend: "<small class='color-gray left opacity padding-tiny radius'>tipo</small><span style='padding: 1px 5px' class='left padding-right font-medium td-title'> select</span>",
                columnName: 'regras',
                columnRelation: 'relatorios_regras',
                columnStatus: {column: '', have: !1, value: !1}
            });
        }

        if (typeof grid.filter[grid.filterRegraIndex].grupos[grid.filterGroupIndex] === "undefined") {
            grid.filter[grid.filterRegraIndex].grupos.push({
                filtros: [],
                identificador: grid.identificador,
                id: Date.now() + Math.floor((Math.random() * 1000)),
                columnTituloExtend: "<small class='color-gray left opacity padding-tiny radius'>grupo</small><span style='padding: 1px 5px' class='left padding-right font-medium td-title'> " + (grid.filter[grid.filterRegraIndex].grupos.length + 1) + "</span>",
                columnName: 'grupos',
                columnRelation: 'relatorios_grupos',
                columnStatus: {column: '', have: !1, value: !1}
            });
        }

        grid.filter[grid.filterRegraIndex].grupos[grid.filterGroupIndex].filtros.push(filter);

        /**
         * Limpa os campos e fecha a interface de novo filtro
         */
        $filter.find(".table-filter-operator, .table-filter-value, .table-filter-btn, .table-filter-operator > .dateOption").addClass("hide");
        $filter.find(".table-filter-columns, .table-filter-operator, .table-filter-value").val("");
        $filter.find(".table-filter-columns:eq(0)").nextAll(".table-filter-columns").remove();

        /**
         * Adiciona filtro a lista de filtros na UI
         */
        let templates = getTemplates();
        let showOperador = grid.$filterGroup.prev(".filter-logic").length || grid.$filterGroup.find(".filter_badge").length;
        grid.$filterGroup.find("#filter_group_logic").append(Mustache.render(templates.filter_badge, Object.assign({
            operadorName: operador,
            showOperador: showOperador
        }, filter)));

        grid.$element.find(".modal-filter").addClass("hide");
        grid.readData()

    }).off("change", ".grupo-join-field-select").on("change", ".grupo-join-field-select", function () {
        let $inner = $(this).closest(".inner_div");
        let grid = grids[$(this).attr("rel")];
        let index = grid.$element.find("#filter-logic").find(".inner_div").index($inner);

        if(typeof grid.filter[index+1] === "object")
            grid.filter[index+1].tipoColumn = $(this).val();

    }).off("click", ".btn-badge-remove").on("click", ".btn-badge-remove", function () {
        let identificador = $(this).attr("rel");
        let grid = grids[identificador];
        let id = $(this).attr("data-badge");

        let del = !1;
        if (!isEmpty(grid.filter)) {
            for (let i in grid.filter) {
                if (!isEmpty(grid.filter[i].grupos)) {
                    for (let ii in grid.filter[i].grupos) {
                        if (!isEmpty(grid.filter[i].grupos[ii].filtros)) {
                            for (let iii in grid.filter[i].grupos[ii].filtros) {

                                /**
                                 * Encontrou item do filtro para ser removido
                                 */
                                if (grid.filter[i].grupos[ii].filtros[iii].id == id) {
                                    grid.filter[i].grupos[ii].filtros.splice(iii, 1);
                                    del = !0;
                                    break;
                                }
                            }
                        }

                        /**
                         * Verifica se o grupo ficou vazio para excluir também
                         */
                        if (del) {
                            if (isEmpty(grid.filter[i].grupos[ii].filtros))
                                grid.filter[i].grupos.splice(ii, 1);

                            break;
                        }
                    }
                }

                /**
                 * Verifica se a regra ficou vazia para excluir também
                 */
                if (del) {
                    if (isEmpty(grid.filter[i].grupos))
                        grid.filter.splice(i, 1);

                    break;
                }
            }
        }

        /**
         * Deleta DOM, e lê novamente a tabela
         */
        if (del) {
            deleteBadge(id, identificador);
            grid.readData();
        }

    }).off("change", ".table-filter-columns").on("change", ".table-filter-columns", function () {
        let $this = $(this);
        let column = $this.val();
        if (column !== "") {
            let entity = $this.data("entity");
            let identificador = $this.attr("rel");

            if (dicionarios[entity][column].key === "relation") {
                let $selectRelation = $('<select class="col s12 m3 table-filter-columns" data-entity="' + dicionarios[entity][column].relation + '" data-rel="' + ($this.siblings(".table-filter-columns").length + 1) + '" rel="' + identificador + '"></select>').insertAfter($this);
                $selectRelation.html("<option disabled='disabled' class='color-text-gray' selected='selected' value=''>coluna...</option>");
                $.each(dicionarios[dicionarios[entity][column].relation], function (col, meta) {
                    $selectRelation.append("<option value='" + col + "' >" + meta.nome + "</option>")
                });
                $this.siblings(".table-filter-operator").addClass("hide");
            } else {
                if(dicionarios[entity][column].format === "datetime" || dicionarios[entity][column].format === "date")
                    $(".table-filter-operator > .dateOption").removeClass("hide");
                else
                    $(".table-filter-operator > .dateOption").addClass("hide");

                $this.siblings(".table-filter-operator").removeClass("hide");
                $this.nextAll(".table-filter-columns").remove();
            }
        }

    }).off("change", ".aggroup").on("change", ".aggroup", function () {
        let identificador = $(this).attr("rel");
        let grid = grids[identificador];
        grid.filterAggroup = $(this).val();

        if(grid.filterAggroup !== "") {
            grid.$element.find(".sum-aggroup").removeClass("hide");
        } else {
            grid.$element.find(".sum-aggroup").addClass("hide");
            grid.filterAggroupSum = [];
            grid.filterAggroupMedia = [];
            grid.filterAggroupMaior = [];
            grid.filterAggroupMenor = [];
        }

        grid.readData();

    }).off("change", ".aggreted-field-type").on("change", ".aggreted-field-type", function () {
        let identificador = $(this).attr("data-rel");
        let grid = grids[identificador];

        grid.filterAggroupSum = [];
        grid.filterAggroupMedia = [];
        grid.filterAggroupMaior = [];
        grid.filterAggroupMenor = [];
        $(".aggreted-field-type").each(function(i, e) {
            switch ($(e).val()) {
                case 'soma':
                    grid.filterAggroupSum.push($(e).attr("rel"));
                    break;
                case 'media':
                    grid.filterAggroupMedia.push($(e).attr("rel"));
                    break;
                case 'maior':
                    grid.filterAggroupMaior.push($(e).attr("rel"));
                    break;
                case 'menor':
                    grid.filterAggroupMenor.push($(e).attr("rel"));
                    break;
            }
        });

        grid.readData();

    }).off("click", "#gerar-relatorio").on("click", "#gerar-relatorio", function () {
        let nome = "";
        if (nome = prompt("Dê um nome para o relatório:")) {
            let id = $(this).attr("rel");
            let grid = grids[id];

            db.exeCreate("relatorios", {
                nome: nome,
                entidade: grid.entity,
                search: grid.search,
                regras: JSON.stringify(grid.filter),
                ordem: grid.order,
                decrescente: grid.orderPosition,
                agrupamento: grid.filterAggroup,
                soma: JSON.stringify(grid.filterAggroupSum),
                media: JSON.stringify(grid.filterAggroupMedia),
                maior: JSON.stringify(grid.filterAggroupMaior),
                menor: JSON.stringify(grid.filterAggroupMenor),
                fields: JSON.stringify(grid.fields)
            }).then(() => {
                toast("Relatório Criado", 2500, "toast-success")
            })
        }

    }).off("click", "#gerar-card-informativo").on("click", "#gerar-card-informativo", function () {
        let nome = "";

        /**
         * Obtém um titulo para o card de relatório
         */
        if (nome = prompt("Dê um nome para seu Card informativo:")) {
            let id = $(this).attr("rel");
            let grid = grids[id];

            /**
             * Obtém a cor de theme-d1 para adicionar como a cor padrão do card relatórios
             */
            let cor = $(".theme-d1").length ? $(".theme-d1").css("background-color") : THEME;
            let cortexto = $(".theme-d1").length ? $(".theme-d1").css("color") : THEMETEXT;

            let hexDigits = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];

            function hex(x) {
                return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
            }

            //Function to convert rgb color to hex format
            function rgb2hex(rgb) {
                rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
            }

            if(!/^#/.test(cor))
                cor = rgb2hex(cor);

            if(!/^#/.test(cortexto))
                cortexto = rgb2hex(cortexto);

            /**
             * Cria card no banco
             */
            db.exeCreate("relatorios_card", {
                nome: nome,
                entidade: grid.entity,
                regras: JSON.stringify(grid.filter),
                ordem: grid.order,
                decrescente: grid.orderPosition,
                agrupamento: grid.filterAggroup,
                soma: JSON.stringify(grid.filterAggroupSum),
                media: JSON.stringify(grid.filterAggroupMedia),
                maior: JSON.stringify(grid.filterAggroupMaior),
                menor: JSON.stringify(grid.filterAggroupMenor),
                cor_de_fundo: cor,
                cor_do_texto: cortexto,
                icone: ""
            }).then(() => {
                toast("Card Informativo Criado", 2500, "toast-success")
            })
        }
    })
})