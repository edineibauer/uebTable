<?php

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Helpers\Check;

$entity = filter_input(INPUT_POST, 'entity', FILTER_DEFAULT);

if (0 < $_FILES['anexo']['error']) {
    $data['error'] = 'Error: ' . $_FILES['anexo']['error'] . '<br>';
    $data['response'] = 2;
} else {
    $file = $_FILES['anexo']['name'];
    $extensao = pathinfo($file, PATHINFO_EXTENSION);
    $name = pathinfo($file, PATHINFO_FILENAME);

    if (in_array($extensao, ["xlsx", "xls", "csv"])) {

        //Obtém os dados do excel
        $columns = [];
        $dados = [];
        $count = -1;

        if ($extensao === "csv") {
            if (($handle = fopen($_FILES['anexo']['tmp_name'], "r")) !== !1) {
                while (($data0 = fgets($handle, 1000)) !== !1) {

                    $data1 = explode(",", $data0);
                    $data2 = explode(";", $data0);
                    $data3 = (count($data2) > count($data1) ? $data2 : $data1);

                    $totalColumns = count($data3);
                    if ($count === -1) {
                        //obtém nome das colunas
                        for ($c = 0; $c < $totalColumns; $c++)
                            $columns[$c] = str_replace("-", "_", Check::name(trim(strip_tags($data3[$c]))));
                    } else {
                        //obtém dados
                        $ponteiro = 0;
                        for ($c = 0; $c < $totalColumns; $c++) {
                            if (isset($columns[$ponteiro])) {
                                if (preg_match('/"$/', $data3[$c])) {
                                    $ponteiro--;
                                    $data3[$c] = $dados[$count][$columns[$ponteiro]] . "," . $data3[$c];
                                }

                                $dados[$count][$columns[$ponteiro]] = str_replace(["'", '"'], "", trim(strip_tags($data3[$c])));
                                $ponteiro++;
                            }
                        }
                    }
                    $count++;
                }
                fclose($handle);
            }
        } else {

            $spreadsheet = new Spreadsheet();
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($_FILES['anexo']['tmp_name']);
            $sheetData = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);

            foreach ($sheetData as $linha => $sheetDatum) {
                foreach ($sheetDatum as $column => $valor) {
                    if ($linha === 1) {
                        //obtém colunas
                        if (!empty($column) && !empty($valor))
                            $columns[$column] = str_replace("-", "_", Check::name(trim(strip_tags($valor))));
                    } elseif (isset($columns[$column])) {
                        //obtém dados
                        $dados[$count][$columns[$column]] = trim(strip_tags($valor ?? null));
                    }
                }
                $count++;
            }
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
                                    if (!empty($d)) {
                                        $dadosDistribuidos[$e][$col] = $d['id'];
                                    } else {
                                        $add = \Entity\Entity::add($meta['relation'], $item);
                                        if (is_numeric($add))
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