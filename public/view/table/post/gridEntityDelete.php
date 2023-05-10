<?php

$data["data"] = 0;
$entity = trim(strip_tags(filter_input(INPUT_POST, "entity")));
$ids = filter_input(INPUT_POST, "ids", FILTER_VALIDATE_INT, FILTER_REQUIRE_ARRAY);
$del = new \Conn\Delete();
$del->exeDelete($entity, "WHERE id IN(" . implode(",", $ids) . ")");
if(empty($del->getErro()))
    $data["data"] = 1;
else
    $data['error'] = $del->getErro();