<?php

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$status = strip_tags(trim(filter_input(INPUT_POST, 'status', FILTER_VALIDATE_BOOLEAN)));
$entity = strip_tags(trim(filter_input(INPUT_POST, 'entity', FILTER_DEFAULT)));
$col = strip_tags(trim(filter_input(INPUT_POST, 'col', FILTER_DEFAULT)));
$dados = [$col => ($status ? 1 : 0), "id" => $id];

$up = new \Conn\Update();
$up->exeUpdate($entity, $dados, "WHERE id = :id", "id={$id}");

$dd = new \Entity\Dicionario($entity);
$oldDados = $dd->getDataForm();
new \Entity\React("update", $entity, $dados, $oldDados);
