<?php

$entity = trim(strip_tags(filter_input(INPUT_POST, "entity")));
$valor = filter_input(INPUT_POST, "valor", FILTER_VALIDATE_INT);
$ids = filter_input(INPUT_POST, "ids", FILTER_VALIDATE_INT, FILTER_REQUIRE_ARRAY);

$info = \Entity\Metadados::getInfo($entity);
$dic = \Entity\Metadados::getDicionario($entity);

if(!empty($dic[$info["status"]]['column'])) {
    $up = new \Conn\Update();
    $up->exeUpdate($entity, [$dic[$info["status"]]['column'] => $valor], "WHERE id IN(" . implode(",", $ids) . ")");
    $data["data"] = 1;
} else {
    $data["error"] = "Não existe a coluna status";
}