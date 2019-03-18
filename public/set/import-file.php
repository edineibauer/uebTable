<?php

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Helpers\Check;

$entity = filter_input(INPUT_POST, 'entity', FILTER_DEFAULT);

if (0 < $_FILES['file']['error']) {
    $data['error'] = 'Error: ' . $_FILES['file']['error'] . '<br>';
    $data['response'] = 2;
} else {
    $file = $_FILES['file']['name'];
    $extensao = pathinfo($file, PATHINFO_EXTENSION);
    $name = pathinfo($file, PATHINFO_FILENAME);

    if (in_array($extensao, ["xlsx", "xls"])) {

        //Prepara variáveis
        $spreadsheet = new Spreadsheet();
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($_FILES['file']['tmp_name']);
        $sheetData = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

        //Obtém os dados do excel
        $columns = [];
        $dados = [];
        $count = -1;
        foreach ($sheetData as $linha => $sheetDatum) {
            foreach ($sheetDatum as $column => $valor) {
                if ($linha === 1) {
                    //obtém colunas
                    $columns[$column] = str_replace("-", "_", Check::name(trim(strip_tags($valor))));
                } elseif (isset($columns[$column])) {
                    //obtém dados
                    $dados[$count][$columns[$column]] = trim(strip_tags($valor ?? null));
                }
            }
            $count++;
        }
        $dadosDistribuidos = [];

        //para cada campo no dicionário
        function addDataToEntity($entity, $dados)
        {

            $dicionario = \Entity\Metadados::getDicionario($entity);
            $dadosDistribuidos = [];
            $relations = [];

            foreach ($dicionario as $meta) {
                if ($meta['key'] === "relation") {
                    $relations[$meta['column']] = $meta;

                } elseif ($meta['key'] !== "information") {
                    //para cada dado encontrado no arquivo
                    foreach ($dados as $i => $dado) {
                        //para cada campo do dado
                        foreach ($dado as $col => $val) {
                            if ($meta['column'] === $col || $entity . "->" . $meta['column'] === $col) {
                                $col = ($meta['column'] === $col ? $col : str_replace($entity . "->", "", $col));
                                $dadosDistribuidos[$i][$col] = $val;
                                unset($dados[$i][$col]);
                                if (empty($dados[$i]))
                                    unset($dados[$i]);

                                break;
                            }
                        }
                    }
                }
            }

            if (!empty($relations) && !empty($dados)) {
                foreach ($relations as $col => $meta) {
                    if (!empty($dados)) {
                        //para cada dado encontrado no arquivo
                        list($result, $dados) = addDataToEntity($meta['relation'], $dados);
                        if (!empty($result)) {
                            foreach ($result as $e => $item) {
                                if ($meta['format'] === "list") {
                                    $d = \Entity\Entity::read($meta['relation'], $item);
                                    if(!empty($d)) {
                                        $dadosDistribuidos[$e][$col] = $d['id'];
                                    } else {
                                        $add = \Entity\Entity::add($meta['relation'], $item);
                                        if(is_numeric($add))
                                            $dadosDistribuidos[$e][$col] = $add;
                                    }
                                } else {
                                    $dadosDistribuidos[$e][$col] = $item;
                                }
                            }
                        }
                    }
                }
            }

            return [$dadosDistribuidos, $dados];
        }

        list($dadosDistribuidos, $rest) = addDataToEntity($entity, $dados);

        //add dados to db
        $import = 0;
        foreach ($dadosDistribuidos as $item) {
            $id = \Entity\Entity::add($entity, $item);
            if (is_numeric($id))
                $import++;
        }

        $data['data'] = $import;
    }
}