(function($) {

function checked_get_list(settings, output_to_coordinate) {
    return _.map($('#' + settings.prefix + 'game-grid .x:checked'), function(item) {
        return output_to_coordinate ?
            item_to_coordinates($(item))
            : $(item)
    })
}

function coordinates_to_item(settings, coordinates) {
    return $('#' + settings.prefix + 'x' + coordinates[0] + 'y' + coordinates[1])
}

function item_to_coordinates(item) {
    return [item.data('x'), item.data('y')]
}

function item_is_prechecked(x_index, y_index, settings) {
    return _.filter(
        settings.init,
        function(coordinates) {
            return coordinates[0] == x_index
                && coordinates[1] == y_index }).length > 0
}

function coordinates_get_random(settings) {
    return [_.sample(_.range(settings.width)),
        _.sample(_.range(settings.height))]
}

function board_build(settings, x_builder, y_builder) {
    return $(document.createElement('div'))
        .attr('id', settings.prefix + 'game-grid')
        .append(
            _.map(_.range(settings.height),
            function(y_index) {
                return y_builder(y_index)
                    .append(
                        _.map(_.range(settings.width),
                        function(x_index) {
                            return x_builder(x_index, y_index)
                        }))
            }))
}

function control_build(settings, builders) {
    return $(document.createElement('div'))
        .attr('id', settings.prefix + 'control-panel')
        .addClass('game-of-life-control-panel')
        .append(_.map(builders, function(builder) {
            return builder()
        }))
}

function neighbours_get_all(settings, coordinates) {
    return _.groupBy(
        _.filter(
                neighbours_get_candidates(coordinates),
                function(coordinates) {
                    return coordinates[0] >= 0
                        && coordinates[0] < settings.width
                        && coordinates[1] >= 0
                        && coordinates[1] < settings.height
                }),
        function(item) {
            return coordinates_to_item(settings, item).prop('checked')
        })
}

function neighbours_get_candidates(coordinates) {
    return [[coordinates[0] - 1, coordinates[1] - 1],
            [coordinates[0] - 1, coordinates[1]],
            [coordinates[0] - 1, coordinates[1] + 1],

            [coordinates[0], coordinates[1] + 1],
            [coordinates[0], coordinates[1] - 1],

            [coordinates[0] + 1, coordinates[1] - 1],
            [coordinates[0] + 1, coordinates[1]],
            [coordinates[0] + 1, coordinates[1] + 1]]
}

function evolve_get_processor(settings) {
    return function() {
        var changes = _.reduce(
                checked_get_list(settings, true),
                function(result, incoming) {
                    var neighbours = neighbours_get_all(settings, incoming)

                    return _.map(
                        _.zip(
                            result,
                            item_reduce_live(incoming, neighbours[true]),
                            neighbours_reduce_die(neighbours[false], settings)
                        ),
                        function(item) {
                            return _.union.apply(_, item)
                        })
                },
                [[], []])

        $.each(changes[0], function() { item_check(coordinates_to_item(settings, this), false) })
        $.each(changes[1], function() { item_check(coordinates_to_item(settings, this), true) })
    }
}

function item_check(item, status) {
    item.prop('checked', status)
}

function item_reduce_live(item, neighbours_checked) {
    return evolve_check_live(neighbours_checked) ?
        [[], [item]]
        : [[item], []]
}

function neighbours_reduce_die(neighbours_unchecked, settings) {
    return [[], _.filter(
        neighbours_unchecked,
        function(item) {
            var neighbours = neighbours_get_all(settings, item)

            return evolve_check_die(neighbours[true])
        })]
}

function item_reduce_die(item, neighbours_checked) {
    return evolve_check_die(neighbours_checked) ?
        [[], [item]]
        : [[item], []]
}

function evolve_check_live(neighbours_checked) {
    return neighbours_checked == undefined ?
        false
        : (neighbours_checked.length >= 2 && neighbours_checked.length <= 3)
}

function evolve_check_die(neighbours_checked) {
    return neighbours_checked == undefined ?
        false
        : neighbours_checked.length == 3
}

function evolve_get_builder(settings) {
    return function() {
        return control_builder(settings, 'Evolve', 'evolve')
            .addClass('non-timer')
            .click(evolve_get_processor(settings))
    }
}

function random_get_builder(settings) {
    return function() {
        return control_builder(settings, 'Randomize', 'random')
            .addClass('non-timer')
            .click(function() {
                $.each(
                    _.range(_.sample(_.range(5, settings.width * settings.height))),
                    function() {
                        coordinates_to_item(settings, coordinates_get_random(settings))
                            .prop('checked', true)
                    })
            })
    }
}

function clear_get_builder(settings) {
    return function() {
        return control_builder(settings, 'Clear', 'clear')
            .addClass('non-timer')
            .click(function() {
                $('#' + settings.prefix + 'game-grid .x').prop('checked', false)
            })
    }
}

function auto_get_builder(settings) {
    return function() {
        return control_builder(settings, 'Automatic', 'auto')
            .data('interval', false)
            .click(function() {
                var item = $(this)

                if(item.data('interval') === false) {
                    $('.non-timer').prop('disabled', true)

                    item.data('interval', 'foo')
                        .data(
                            'interval',
                            setInterval(
                                function() {
                                    var action = evolve_get_processor(settings)

                                    action()
                                },
                                250))
                        .text('Stop')
                } else {
                    $('.non-timer').prop('disabled', false)

                    clearInterval(item.data('interval'))
                    item.data('interval', false)
                        .text('Automatic')
                }
            })
    }
}

function reset_get_builder(settings) {
    return function() {
        return control_builder(settings, 'Reset', 'reset')
            .addClass('non-timer')
            .click(function() {
                $('#' + settings.prefix + 'game-grid .x').prop('checked', false)

                $.each(
                    settings.init,
                    function() {
                        console.log(this)
                        coordinates_to_item(settings, this).prop('checked', true)
                    })
            })
    }
}

function control_builder(settings, caption, id) {
    return $(document.createElement('button'))
        .attr('id', settings.prefix + id)
        .text(caption)
}

function x_get_builder(settings) {
    return function(x_index, y_index) {
        return $(document.createElement('input'))
            .attr('type', 'checkbox')
            .addClass('x')
            .attr('id', settings.prefix + 'x' + x_index + 'y' + y_index)
            .data('x', x_index)
            .data('y', y_index)
            .prop('checked', item_is_prechecked(x_index, y_index, settings))
            .prop('disabled', settings.disabled)
    }
}

function y_get_builder(settings) {
    return function(index) {
        return $(document.createElement('div'))
                .addClass('y')
                .attr('id', settings.prefix + 'y' + index)
                .data('y', index)
    }
}

function control_get_builder(settings) {
    return [].concat(
        settings.evolve ? [evolve_get_builder(settings)] : [],
        settings.reset ? [reset_get_builder(settings)] : [],
        settings.randomize ? [random_get_builder(settings)] : [],
        settings.clear ? [clear_get_builder(settings)] : [],
        settings.automate ? [auto_get_builder(settings)] : [])
}

$.fn.game_of_life = function(options) {
    var settings = $.extend({
            width: 20,
            height: 20,
            prefix: 'gol-',
            init: [],
            evolve: true,
            randomize: true,
            clear: true,
            automate: true,
            disabled: true,
            reset: false
        },
        options),
        item = this

    item.addClass('game-of-life')
        .append(control_build(
            settings,
            control_get_builder(settings)))
        .append(board_build(
            settings,
            x_get_builder(settings),
            y_get_builder(settings)))
}

})(jQuery)
