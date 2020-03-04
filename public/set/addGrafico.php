<?php

$entity = filter_input(INPUT_POST, 'entity', FILTER_DEFAULT);
$x = filter_input(INPUT_POST, 'x', FILTER_DEFAULT);
$y = filter_input(INPUT_POST, 'y', FILTER_DEFAULT);
$type = filter_input(INPUT_POST, 'type', FILTER_DEFAULT);
$operacao = filter_input(INPUT_POST, 'operacao', FILTER_DEFAULT);
$group = filter_input(INPUT_POST, 'group', FILTER_DEFAULT);
$order = filter_input(INPUT_POST, 'order', FILTER_DEFAULT);
$precision = filter_input(INPUT_POST, 'precision', FILTER_VALIDATE_INT);

$graficos = [];
if(file_exists(PATH_HOME . "_config/graficos.json"))
    $graficos = json_decode(file_get_contents(PATH_HOME . "_config/graficos.json"), !0);

$graficos[] = ["id" => strtotime('now') . rand(0, 99999), "entity" => $entity, "x" => $x, "y" => $y, "operacao" => $operacao, "type" => $type, "group" => $group, "order" => $order, "precision" => $precision];

$f = fopen(PATH_HOME . "_config/graficos.json", "w+");
fwrite($f, json_encode($graficos));
fclose($f);

$data['data'] = 1;