if(typeof loadListagem === "undefined") {
    function loadListagem() {
        let entityListagem = app.route.replace("listagem/", "");
        if (entityListagem.indexOf('/') > -1) {
            let t = entityListagem.split('/');
            entityListagem = t[0];
        }

        for(var i in dicionarios) {
            if(i === entityListagem) {
                $("#dashboard").html("").grid(entityListagem);
                return false;
            }
        }
    }
}

$(function () {
    loadListagem();
})