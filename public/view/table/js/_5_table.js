function sanitizeCSS(css) {
    // Remover tags <script>, <iframe>, ou quaisquer tags HTML indesejadas
    css = css.replace(/<\/?[^>]+(>|$)/g, ""); // Remove qualquer tag HTML

    // Verificar por tentativas de injeção de JavaScript
    const invalidPatterns = [
        /javascript:/gi, // Remover "javascript:" em qualquer lugar
        /expression\(/gi, // Remover expressões CSS que executam código
        /url\(["']?javascript:/gi // Remover URLs baseadas em "javascript:"
    ];

    invalidPatterns.forEach(pattern => {
        css = css.replace(pattern, "");
    });

    return css;
}

$(function () {

    if(app.param.css)
        $target.closest(".core-class-container").prepend("<style>" + sanitizeCSS(app.param.css) + "</style>");

    $("#table-maestru").grid(app.param.url[0]);
})