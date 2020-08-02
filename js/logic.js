var tran = new Translater({
    lang:"en",
    lang:"ru"
});
tran.setLang('default');

var totalItems = $('#0 li').length;
//Shuffle the list
$('#0').shuffle();
$('#shu').click(function () {
    $('#0').shuffle();
    $("#masterList").sortable({ items: "li", handle: '.containerTitle', opacity: 0.6, helper: 'clone', forcePlaceholderSize: true, forceHelperSize: true });
    return false;
});

//Planning processes ordering test
$('#planning').click(function () {
    //first trigger new game
    $('#new').trigger('click').replaceWith("<a href='index.html'>Start new game</a>");
    $('#result').replaceWith("<a href='#' id='seq' style='color:#C60'>Show sequence errors and hints to fix them</a>");
    $('#shu').replaceWith("<a href='#' id='shuPla'>Shuffle the 'Planning' list</a>");

    $('#shuPla').click(function () {
        $('.planning').shuffle();
        $(".planning").sortable({ items: "li", handle: '.containerTitle', opacity: 0.6, helper: 'clone', forcePlaceholderSize: true, forceHelperSize: true });
        return false;
    });

    //Show sequence of planning items
    $('#seq').click(function () {
        $('.unmovable').remove();

        i = 201;
        n = 1;

        $('.pane ul').find('li').each(function () {
            $(this).attr('rel', i);
            i++;
        });

        $('.pane ul').find('li').each(function () {
            if (parseInt($(this).attr('rel')) != parseInt($(this).attr('value'))) {
                var updown = '';
                if (parseInt($(this).attr('rel')) > parseInt($(this).attr('value')))
                    updown = parseInt($(this).attr('rel')) - parseInt($(this).attr('value')) + " steps UP &uarr;";
                else
                    updown = parseInt($(this).attr('value')) - parseInt($(this).attr('rel')) + " steps DOWN &darr;";

                $(this).find('.bullet').remove();
                $(this).html("<span class=bullet>" + updown + " - </span>" + $(this).html()).css('background', '#C60');
            }
            else {
                $(this).find('.bullet').remove();
                $(this).html("<span class=bullet>" + n + " - </span>" + $(this).html()).css('background', '#E7E7E7');
            }
            n++;
        });

        return false;
    });

    //From everything from mixed but leave planning
    $('#0').find('li').each(function () {
        if ($(this).attr('id') != '2') $(this).remove();//remove all others
    });

    //shift planning list from mixed to planning
    $('.planning').append($('#0').html());
    //Shuffle planning list
    $('.planning').shuffle().parent().css({ "width": "500px", "margin": "0 auto", "position": "absolute", "left": "32%" });
    $(".planning").sortable({ items: "li", handle: '.containerTitle', opacity: 0.6, helper: 'clone', forcePlaceholderSize: true, forceHelperSize: true });

    //Remove all other panels and just leave the planning panel for eazy sorting
    $('#masterList').find('ul').each(function () {
        if (!$(this).hasClass('planning')) $(this).parent().remove();
    });
    return false;
});


$('#new').click(function () {
    if (!confirm('Are you sure you want to start a new game?')) return false;
    var list = '';
    $('.pane').each(function () {
        list += $(this).find('ul').html();
        $(this).find('ul').html("<li class='unmovable'></li>");
    });
    $('#0').append(list).shuffle();
    $('#0').find('.correct').each(function () {
        $(this).parent().css('background', '#E7E7E7');
        $(this).remove();
    });
    $('#r').remove();
    $("#masterList").sortable({ items: "li", handle: '.containerTitle', opacity: 0.6, helper: 'clone', forcePlaceholderSize: true, forceHelperSize: true });
    return false;
});

//Make all <li> items in the list sortable using the jQuery UI Sortables code
$("#masterList").sortable({ items: "li", handle: '.containerTitle', opacity: 0.6, helper: 'clone', forcePlaceholderSize: true, forceHelperSize: true });
$(".containerTitle").mousedown(function () { alert('You cannot move main heading!'); });
$('#hide,#hide1').click(function () { $(this).parent().slideUp('slow'); return false; });

$('#result').click(
    function () {
        if ($('#0').find('li').length == totalItems) {
            alert('No results found.');
            return false;
            //if (!confirm('Are you sure you want to check the results\nbefore you complete the game?')) return false;
        }

        var wrong = 0;
        var total = 0;
        $("#masterList").find('li').each(function () {
            //Check the result
            if ($(this).attr('id') != $(this).parent().attr('id') && $(this).parent().attr('id') != '0' && $(this).attr('class') != 'unmovable') {
                $(this).css("background", "#FF7774");
                wrong += 1;
                var correctHeading = '';
                var currentId = $(this).attr('id');
                $("#masterList").find('ul').each(function () {
                    if ($(this).attr('id') == currentId)
                        correctHeading = $(this).parent().find('.containerTitle').html();
                });
                $(this).find('.correct').remove();
                $(this).append("<span class='correct' style='display:block;padding-top:3px;margin-top:3px;border-top: 1px dotted #ff0000;'><strong>Should be under:<br> \"" + correctHeading + "\"</strong></span>");
            }

            //attmpted
            if ($(this).parent().attr('id') != '0' && $(this).attr('class') != 'unmovable') total += 1;
        });
        $('#r').remove();

        if (total > 0) {
            var string = "<span id='r'> ( Total: <strong>" + totalItems + "</strong> | Attempted: <strong>";
            string += total + "</strong> | Result: <strong>" + parseInt(total - wrong) + "</strong> out of <strong>";
            string += total + "</strong> | <strong>";
            string += parseInt((total - wrong) * 100 / total);
            string += "%</strong>)</span>";
            $(this).after(string);
        }
        return false;
    });