import _ from 'lodash';
import { getValueFormats } from '@grafana/ui';

export class ColumnOptionsCtrl {
  panel: any;
  panelCtrl: any;
  colorModes: any;
  columnStyles: any;
  columnTypes: any;
  columnWidths: any;
  fontSizes: any;
  dateFormats: any;
  addColumnSegment: any;
  unitFormats: any;
  getColumnNames: any;
  activeStyleIndex: number;
  mappingTypes: any;

  /** @ngInject */
  constructor($scope: any) {
    $scope.editor = this;

    this.activeStyleIndex = 0;
    this.panelCtrl = $scope.ctrl;
    this.panel = this.panelCtrl.panel;
    this.unitFormats = getValueFormats();
    this.colorModes = [
      { text: 'Disabled', value: null },
      { text: 'Cell', value: 'cell' },
      { text: 'Value', value: 'value' },
      { text: 'Row', value: 'row' },
    ];
    this.columnTypes = [
      { text: 'Number', value: 'number' },
      { text: 'String', value: 'string' },
      { text: 'Date', value: 'date' },
      { text: 'Hidden', value: 'hidden' },
      { text: 'Font Awesome', value: 'fontawesome' },
      { text: 'HTML', value: 'html' },
    ];
    this.columnWidths = [
      'inherit',
      'initial',
      'auto',
      '1%',
      '2%',
      '3%',
      '4%',
      '5%',
      '6%',
      '7%',
      '8%',
      '9%',
      '10%',
      '11%',
      '12%',
      '13%',
      '14%',
      '15%',
      '16%',
      '17%',
      '18%',
      '19%',
      '20%',
      '21%',
      '22%',
      '23%',
      '24%',
      '25%',
      '26%',
      '27%',
      '28%',
      '29%',
      '30%',
      '31%',
      '32%',
      '33%',
      '34%',
      '35%',
      '36%',
      '37%',
      '38%',
      '39%',
      '40%',
      '41%',
      '42%',
      '43%',
      '44%',
      '45%',
      '46%',
      '47%',
      '48%',
      '49%',
      '50%',
      '51%',
      '52%',
      '53%',
      '54%',
      '55%',
      '56%',
      '57%',
      '58%',
      '59%',
      '60%',
      '61%',
      '62%',
      '63%',
      '64%',
      '65%',
      '66%',
      '67%',
      '68%',
      '69%',
      '70%',
      '71%',
      '72%',
      '73%',
      '74%',
      '75%',
      '76%',
      '77%',
      '78%',
      '79%',
      '80%',
      '81%',
      '82%',
      '83%',
      '84%',
      '85%',
      '86%',
      '87%',
      '88%',
      '89%',
      '90%',
      '91%',
      '92%',
      '93%',
      '94%',
      '95%',
      '96%',
      '97%',
      '98%',
      '99%',
      '100%',
    ];
    this.fontSizes = ['80%', '90%', '100%', '110%', '120%', '130%', '150%', '160%', '180%', '200%', '220%', '250%'];
    this.dateFormats = [
      { text: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
      { text: 'YYYY-MM-DD HH:mm:ss.SSS', value: 'YYYY-MM-DD HH:mm:ss.SSS' },
      { text: 'MM/DD/YY h:mm:ss a', value: 'MM/DD/YY h:mm:ss a' },
      { text: 'MMMM D, YYYY LT', value: 'MMMM D, YYYY LT' },
      { text: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
    ];
    this.mappingTypes = [{ text: 'Value to text', value: 1 }, { text: 'Range to text', value: 2 }];

    this.getColumnNames = () => {
      if (!this.panelCtrl.table) {
        return [];
      }
      return _.map(this.panelCtrl.table.columns, (col: any) => {
        return col.text;
      });
    };

    this.onColorChange = this.onColorChange.bind(this);
  }

  render() {
    this.panelCtrl.render();
  }

  setUnitFormat(column: any, subItem: any) {
    column.unit = subItem.value;
    this.panelCtrl.render();
  }

  addColumnStyle() {
    const newStyleRule: object = {
      unit: 'short',
      type: 'number',
      alias: '',
      decimals: 2,
      colors: ['rgba(245, 54, 54, 0.9)', 'rgba(237, 129, 40, 0.89)', 'rgba(50, 172, 45, 0.97)'],
      colorMode: null,
      pattern: '',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      thresholds: [],
      mappingType: 1,
    };

    const styles = this.panel.styles;
    const stylesCount = styles.length;
    let indexToInsert = stylesCount;

    // check if last is a catch all rule, then add it before that one
    if (stylesCount > 0) {
      const last = styles[stylesCount - 1];
      if (last.pattern === '/.*/') {
        indexToInsert = stylesCount - 1;
      }
    }

    styles.splice(indexToInsert, 0, newStyleRule);
    this.activeStyleIndex = indexToInsert;
  }

  removeColumnStyle(style: any) {
    this.panel.styles = _.without(this.panel.styles, style);
  }

  invertColorOrder(index: number) {
    const ref = this.panel.styles[index].colors;
    const copy = ref[0];
    ref[0] = ref[2];
    ref[2] = copy;
    this.panelCtrl.render();
  }

  onColorChange(style: any, colorIndex: number) {
    return (newColor: string) => {
      style.colors[colorIndex] = newColor;
      this.render();
    };
  }

  addValueMap(style: any) {
    if (!style.valueMaps) {
      style.valueMaps = [];
    }
    style.valueMaps.push({ value: '', text: '' });
    this.panelCtrl.render();
  }

  removeValueMap(style: any, index: number) {
    style.valueMaps.splice(index, 1);
    this.panelCtrl.render();
  }

  addRangeMap(style: any) {
    if (!style.rangeMaps) {
      style.rangeMaps = [];
    }
    style.rangeMaps.push({ from: '', to: '', text: '' });
    this.panelCtrl.render();
  }

  removeRangeMap(style: any, index: number) {
    style.rangeMaps.splice(index, 1);
    this.panelCtrl.render();
  }
}

/** @ngInject */
export function columnOptionsTab($q: any, uiSegmentSrv: any) {
  'use strict';
  return {
    restrict: 'E',
    scope: true,
    templateUrl: 'public/app/plugins/panel/table/column_options.html',
    controller: ColumnOptionsCtrl,
  };
}
