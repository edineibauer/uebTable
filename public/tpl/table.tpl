<div class="responsive tableList" id="tableList-{$entity}" data-entity="{$entity}">
    <div class="row panel">

        <div class="font-xlarge left">{$entityName}</div>

        <span class="padding-medium color-text-grey left">
            <b id="table-total-{$entity}">{$total}</b> registros</span>

        <button class="btb right theme-d2 hover-shadow opacity hover-opacity-off" id="btn-table-{$entity}"
                onclick="tableNovo('{$entity}')">
            <i class="material-icons left">add</i><span class="left">Novo</span>
        </button>

        <label class="right">
            <input type="text" class="table-campo-geral" autocomplete="off" id="table-campo-geral-{$entity}" data-entity="{$entity}"
                   placeholder="busca..." style="margin-bottom: 0;font-size:14px"/>
        </label>

        <select class="right tableLimit font-small" id="limit-{$entity}" data-entity="{$entity}"
                style="width: auto;margin-bottom: 0;margin-top: 1.5px;">
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
        </select>

        <span class="padding-small color-text-grey right table-cont-pag" style="margin-top: 5px;"
              id="table-cont-pag-{$entity}"></span>

    </div>
    <table class="table-all" id="table-{$entity}">
        <thead>
        <tr>
            {$first = 0}
            {foreach item=item key=column from=$header}
                <th>
                    {if $first == 0}
                        {$first = 1}
                        <label class="left">
                            <input type="checkbox" class="table-select-all" data-entity="{$entity}"
                                   style="margin: 15px 2rem 11px 0px;"/>
                        </label>
                    {/if}
                    {if $column == $status}
                        {if !$buttons.status}
                            <span>{$item.nome}</span>
                        {/if}
                    {else}
                        <span>{$item.nome}</span>
                    {/if}
                </th>
            {/foreach}
            <th class="align-right" style="padding-right: 20px;">Ações</th>
        </tr>
        </thead>
        <tbody class="relative"></tbody>
    </table>

    <div class="row panel" id="pagination-{$entity}"></div>

    <input type="hidden" class="table-pagina-{$entity}" value="1" data-entity="{$entity}" id="table-pagina-{$entity}"/>

    <link rel="stylesheet" href="{$home}assetsPublic/tableCore.min.css">
    <script src="{$home}assetsPublic/tableCore.min.js" defer></script>
</div>