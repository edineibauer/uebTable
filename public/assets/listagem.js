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
                    $("#listagem").html("").grid(entityListagem);
                    return false;
                }
            }
        });
    }
}

$(function () {
    loadListagem();
})