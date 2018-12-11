<?php
$entity = strip_tags(trim(filter_input(INPUT_POST, 'entity', FILTER_DEFAULT)));

if ($entity && !empty($entity)) {
    $table = new \Table\Table($entity);
    $data['data'] = $table->getShow();
}