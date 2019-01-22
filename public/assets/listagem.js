if(typeof loadListagem === "undefined") {
    function loadListagem() {
        let entityListagem = app.route.replace("listagem/", "");
        if (entityListagem.indexOf('/') > -1) {
            let t = entityListagem.split('/');
            entityListagem = t[0];
        }

        dbLocal.exeRead('__dicionario', 1).then(dic => {
            for(var i in dic) {
                if(i === entityListagem) {

                    //entity title
                    let p = new RegExp(/s$/i);
                    let title = ucFirst((p.test(entityListagem) ? entityListagem.substr(0, (entityListagem.length - 1)) : entityListagem).replaceAll('_', ' ').replaceAll('-', ' '));
                    $("#core-content").find("h4").html(title + " <small class='opacity'> >> listagem</small>");

                    //form
                    $("#listagem").html("").grid(entityListagem);
                    $.cachedScript(HOME + "assetsPublic/tableCore.min.js");

                    return false;
                }
            }
        });
    }
}

$(function () {
    $("#core-content").off("click", ".table-reload").on("click", ".table-reload", function () {
        loadListagem();
    });
})

loadListagem();