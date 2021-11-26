<?php

$entity = trim(strip_tags(filter_input(INPUT_POST, "entity")));
$ids = filter_input(INPUT_POST, "ids", FILTER_VALIDATE_INT, FILTER_REQUIRE_ARRAY);
$del = new \Conn\Delete();
$del->exeDelete($entity, "WHERE id IN(" . implode(",", $ids) . ")");
$data["data"] = 1;