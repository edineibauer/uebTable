{foreach $values as $dado}
    <tr id="row-{$entity}-{$dado.tdInfo.id}">
        {$first = 0}
        {foreach item=data key=column from=$dado}
            {if $column !== "tdInfo"}
                <td class="padding-16 {($data.format === "source") ? "tableImgTd" : ""} {$data.class}"
                    style="{$data.style} {($data.format === "source") ? "background-image: url(image/{$data.value}&h=70&w=300);" : ""}">
                    {if $first == 0}
                        {$first = 1}
                        <label class="left">
                            <input type="checkbox" class="table-select" rel="{$dado.tdInfo.id}" data-entity="{$entity}"
                                   style="margin: 15px 2rem 11px 0px;"/>
                        </label>
                    {/if}
                    {if $column == $status}
                        {if !$buttons.status}
                            {if $data.value}
                                <span class='color-green tag'>&nbsp;ON&nbsp;</span>
                            {else}
                                <span class='color-orange tag color-text-white'>OFF</span>
                            {/if}
                        {/if}
                    {elseif $data.format !== "source"}
                        {$data.value}
                    {/if}
                </td>
            {/if}
        {/foreach}

        <td class="tableActions{if $dado.tdInfo.tableAllowPermission == false} disabled" title="Sem Permissão{/if}">
            {if $buttons.delete}
                <button id="del-{$entity}-{$dado.tdInfo.id}" onclick="deleteEntityData('{$entity}', {$dado.tdInfo.id})"
                        class="right btn-floating color-white color-hover-text-red hover-shadow opacity hover-opacity-off">
                    <i class="material-icons">delete</i>
                </button>
            {/if}
            {$buttons.copy}
            {if $buttons.copy}
                <button title="duplicar" id="dup-{$entity}-{$dado.tdInfo.id}"
                        onclick="duplicateEntityData('{$entity}', {$dado.tdInfo.id})"
                        class="right color-hover-text-green btn-floating color-white hover-shadow opacity hover-opacity-off">
                    <i class="material-icons">content_copy</i>
                </button>
            {/if}
            {if $buttons.edit}
                <button id="edit-{$entity}-{$dado.tdInfo.id}" onclick="editEntityData('{$entity}', {$dado.tdInfo.id})"
                        class="right btn-floating color-white hover-shadow opacity hover-opacity-off">
                    <i class="material-icons">edit</i>
                </button>
            {/if}
            {if $buttons.status && $status}
                <label class="right">
                    <div class="switch switch-squad margin-0 margin-right">
                        <input type="checkbox" class="switch-status-table" data-status="{$status}"
                               data-entity="{$entity}" rel="{$dado.tdInfo.id}"
                                {($dado.tdInfo.status) ? "checked='checked' " : "" }
                               class="switchCheck"/>
                        <div class="slider"></div>
                    </div>
                </label>
            {/if}
        </td>
    </tr>
{/foreach}