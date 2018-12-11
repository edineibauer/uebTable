<?php
$entity = strip_tags(trim(filter_input(INPUT_POST, 'entity', FILTER_DEFAULT)));
$limit = filter_input(INPUT_POST, 'limit', FILTER_VALIDATE_INT);
$offset = filter_input(INPUT_POST, 'offset', FILTER_VALIDATE_INT);
$order = strip_tags(trim(filter_input(INPUT_POST, 'order', FILTER_DEFAULT)));
$orderAsc = strip_tags(trim(filter_input(INPUT_POST, 'orderAsc', FILTER_VALIDATE_BOOLEAN)));
$search = filter_input(INPUT_POST, 'search', FILTER_DEFAULT);

$read = new \Table\TableData($entity);
$read->toggleButton("copy");
$read->setLimit($limit);
$read->setPagina($offset);
$read->setOrder($order);
$read->setOrderAsc($orderAsc);
if (!empty($search))
    $read->setSearch($search);

$data['data'] = [];
$data['data']['content'] = $read->getDados();
$data['data']['pagination'] = $read->getPagination();
$data['data']['total'] = $read->getTotal();
