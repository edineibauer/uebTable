$(function () {
    $("#app").off("click", "#gerar-grafico").on("click", "#gerar-grafico", function () {
        let id = $(this).attr("rel");
        let grid = grids[id];
        grid.$element.find(".modal-grafico").removeClass("hide");
        let contentY = "";
        let contentX = "";
        for (let column in dicionarios[grid.entity]) {
            let meta = dicionarios[grid.entity][column];
            if (meta.key !== "publisher" && meta.key !== "information" && meta.key !== "identifier") {
                contentY += "<option value='" + column + "'>" + meta.nome + "</option>";
                contentX += "<option value='" + column + "'" + (meta.format === "datetime" || meta.format === "date" ? " selected='selected'" : "") + ">" + meta.nome + "</option>"
            }
        }
        readGraficosTable(id);
        $(".table-grafico-columns-y").attr("data-id", id).html("<option value='' selected='selected'>Nenhum</option>" + contentY);
        $(".table-grafico-columns-x").html("<option disabled='disabled' value='' selected='selected'>Selecione o X</option>" + contentX);

    }).off("click", ".btn-table-grafico-apply").on("click", ".btn-table-grafico-apply", function () {
        let y = $(".table-grafico-columns-y").val();
        let x = $(".table-grafico-columns-x").val();
        let type = $(".table-grafico-columns-type").val();
        let operacao = $(".table-grafico-columns-operacao").val();
        let group = $(".table-grafico-columns-group").val();
        let order = $(".table-grafico-columns-order").val();
        let precision = $(".table-grafico-columns-precision").val();
        let size = $(".table-grafico-columns-size").val();
        let posicao = $(".table-grafico-columns-posicao").val();
        let labely = $(".table-grafico-columns-label-y").val();
        let labelx = $(".table-grafico-columns-label-x").val();
        let rounded = $(".table-grafico-columns-rounded").val();
        let minimoY = $(".table-grafico-columns-minimo-y").val();
        let maximoY = $(".table-grafico-columns-maximo-y").val();
        let minimoX = $(".table-grafico-columns-minimo-x").val();
        let maximoX = $(".table-grafico-columns-maximo-x").val();
        let id = $(".table-grafico-columns-y").attr("data-id");

        /**
         * clear erros anteriores
         */
        $(".table-grafico-columns").css("border-bottom-color", "#009688").siblings("div").addClass("color-text-gray").css("color", "initial");
        $(".required-grafico").remove();

        /**
         * Requires
         */
        switch (type) {
            case "donut":
                if (typeof x !== "string" || isEmpty(x)) {
                    toast("informe o X", 3000, "toast-warning");
                    $(".table-grafico-columns-x").css("border-bottom-color", "red").siblings("div").removeClass("color-text-gray").css("color", "red").append("<div class='required-grafico padding-small' style='display: inline'>*</div>");
                    return;
                }
                if (typeof y !== "string" || isEmpty(y)) {
                    toast("informe o Y", 3000, "toast-warning");
                    $(".table-grafico-columns-y").css("border-bottom-color", "red").siblings("div").removeClass("color-text-gray").css("color", "red").append("<div class='required-grafico padding-small' style='display: inline'>*</div>");
                    return;
                }
                break;
        }

        if (type === "radialBar" && (isEmpty(maximo) || isNaN(maximo))) {
            toast("Valor máximo é obrigatório para o Modelo barra Circular", 5000, "toast-warning");
            $(".table-grafico-columns-maximo").css("border-bottom-color", "red").siblings("div").removeClass("color-text-gray").css("color", "red").append("<div class='required-grafico padding-small' style='display: inline'>*</div>");
            return;
        }

        if (isEmpty(x) && ["radialBar"].indexOf(type) === -1) {
            toast("informe o X", 3000, "toast-warning");
            $(".table-grafico-columns-x").css("border-bottom-color", "red").siblings("div").removeClass("color-text-gray").css("color", "red").append("<div class='required-grafico padding-small' style='display: inline'>*</div>");
            return;
        }

        post("table", "addGrafico", {
            x: x,
            y: y,
            entity: grids[id].entity,
            type: type,
            group: group,
            order: order,
            precision: precision,
            operacao: operacao,
            size: size,
            posicao: posicao,
            minimoY: minimoY,
            maximoY: maximoY,
            minimoX: minimoX,
            maximoX: maximoX,
            labely: labely,
            labelx: labelx,
            rounded: rounded,
        }, function (g) {
            if (g) {
                updateGraficos().then(() => {
                    readGraficosTable(id)
                });
                toast("Salvo com sucesso", 3500, "toast-success")
            } else {
                toast("erro ao enviar", 3000, "toast-error")
            }
        });

    }).off("click", ".btn-grafico-delete").on("click", ".btn-grafico-delete", function () {
        let id = $(this).attr("data-id");
        post("table", "deleteGrafico", {id: $(this).attr("rel")}, function (g) {
            updateGraficos().then(() => {
                readGraficosTable(id)
            })
        })
    }).off("change", ".table-grafico-columns-type").on("change", ".table-grafico-columns-type", function () {
        let v = $(this).val();
        $(".table-grafico-columns").removeClass("disabled").removeAttr("disabled");

        if(v === "radialBar") {
            $(".table-grafico-columns-x").addClass("disabled").attr("disabled", "disabled").val("").trigger("change");
            $(".table-grafico-columns-label-x").addClass("disabled").attr("disabled", "disabled").val("").trigger("change");
        }

    }).off("click", ".btn-close-modal").on("click", ".btn-close-modal", function () {
        let grid = grids[$(this).attr("rel")];
        grid.$element.find(".modal-filter, .modal-grafico").addClass("hide")
    });
});