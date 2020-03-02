<?php

$entity = $link->getVariaveis()[0];
$graficos = [];

if(file_exists(PATH_HOME . "_config/graficos.json")) {
    $graficosJson = json_decode(file_get_contents(PATH_HOME . "_config/graficos.json"), !0);
    foreach ($graficosJson as $grafico) {
        if($grafico['entity'] === $entity)
            $graficos[] = $grafico;
    }
}

$data['data'] = $graficos;