{
    const activity = icu.activity;
    const streams = icu.streams;

    const crankLength_mm = activity.crank_length;
    const crankLength_m = crankLength_mm / 1000;
    const ftp = activity.icu_ftp;

    let pwr = [];
    let cad = [];

    const pwrStream = streams.get('watts');
    if (pwrStream != null) {
        pwr = pwrStream.data;
    }

    const cadStream = streams.get('cadence');
    if (cadStream != null) {
        cad = cadStream.data;
    }

    const range = getFloorCeil(pwr);
    const baseAepf = aepf(ftp, 80, crankLength_m);
    const baseCvp = cpv(80, crankLength_m);

    const x = [];
    const y = [];
    const ftpParabolaX = [];
    const ftpParabolaY = [];

    let cpvMax = 0;
    let aepfMax = 0;

    pwr.forEach((P, idx) => {
        if (P && P < range.maxValue && P >= range.minValue) {
            const C = cad[idx];
            const cpvVal = cpv(C, crankLength_m);
            const aepfVal = aepf(P, C, crankLength_m);

            if(!isNaN(cpvVal) && cpvVal > cpvMax) { 
                cpvMax = cpvVal;
            }

            if(!isNaN(aepfVal) && aepfVal !== Infinity && aepfVal > aepfMax) {
                aepfMax = aepfVal;
            }

            x.push(cpvVal);
            y.push(aepfVal);
        }
    });

    for(let i = 0; i <=120; i++) {
        ftpParabolaX.push(cpv(i, crankLength_m));
        ftpParabolaY.push(aepf(ftp, i, crankLength_m));
    }

    let data = [
        {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'markers',
            marker: {
                size: 2,
            },
            showlegend: false,
            name: 'CVP vs AEPF'
        },
        {
            x: [0, cpvMax],
            y: [baseAepf, baseAepf],
            type: 'lines',
            line: {
                dash: 'dashdot',
                width: 1,
                color: '#999'
            },
            showlegend: false,
            name: `AEPF at FTP (${ftp}w)`
        },
        {
            x: [baseCvp, baseCvp],
            y: [0, aepfMax],
            type: 'lines',
            line: {
                dash: 'dashdot',
                width: 1,
                color: '#999'
            },
            showlegend: false,
            name: `CVP at FTP (${ftp}w)`
        },
        {
            x: ftpParabolaX,
            y: ftpParabolaY,
            type: 'lines',
            line: {
                width: 1
            },
            showlegend: false,
            name: `FTP (${ftp}w)`
        }
    ];

    const annotationSettings = {
        bgcolor: '#eee',
        opacity: 0.8,
        borderradius: 5,
        font: {
            color: '#666'
        }
    }

    let layout = {
        title: {
            text: `Quadrant Analysis`,
        },
        xaxis: {
            title: 'Circumferential Pedal Velocity (CPV), (m/s)',
            range: [0, cpvMax],
            autorange: false,
            titlefont: {
                color: 'lightgray'
            }
        },
        yaxis: {
            title: 'Average Effective Pedal Force (AEPF), (N)',
            range: [0, aepfMax],
            autorange: false,
            titlefont: {
                color: 'lightgray'
            }
        },
        annotations: [
            {
                x: .1,
                y: baseAepf + 30,
                text: 'HF / LV',
                showarrow: false,
                ...annotationSettings
            },
            {
                x: .1,
                y: baseAepf - 30,
                text: 'LF / LV',
                showarrow: false,
                ...annotationSettings
            },
            {
                x: cpvMax - .1,
                y: baseAepf + 30,
                text: 'HF / HV',
                showarrow: false,
                ...annotationSettings
            },
            {
                x: cpvMax - .1,
                y: baseAepf - 30,
                text: 'LF / HV',
                showarrow: false,
                ...annotationSettings
            }
        ]
    };

    chart = { data, layout };
}

function aepf(power, cadence, cranklength) {
    return (power * 60) / (cadence * 2 * Math.PI * cranklength);
}

function cpv(cadence, cranklength) {
    return (cadence * cranklength * 2 * Math.PI) / 60;
}

function getFloorCeil(arr) {
    if (arr.length < 4) return arr;

    let values, q1, q3, iqr, maxValue, minValue;

    values = arr.slice().sort((a, b) => a - b); //copy array fast and sort

    if ((values.length / 4) % 1 === 0) {
        //find quartiles
        q1 = (1 / 2) * (values[values.length / 4] + values[values.length / 4 + 1]);
        q3 = (1 / 2) * (values[values.length * (3 / 4)] + values[values.length * (3 / 4) + 1]);
    } else {
        q1 = values[Math.floor(values.length / 4 + 1)];
        q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
    }

    iqr = q3 - q1;
    maxValue = q3 + iqr * 1.5;
    minValue = q1 - iqr * 1.5;

    return {
        maxValue,
        minValue,
    };
}