$(document).ready(function () {
  let master = {};
  let totalOdd = 0;
  let eOdd = $("#i-odd");
  let eReward = $("#i-reward");
  let eReq = $("#i-requirement");
  let eName = $("#name");
  let eTable = $("#table-data");
  let eFile = $("#open");

  let db = eTable.DataTable({
    serverSide: false,
    autoWidth: false,
    processing: true,
    searching: false,
    pageLength: 9999,
    paging: false,
    bInfo: false,
    columns: [
      {
        title: "Odd",
        data: "odd",
        width: 100,
        class: ['text-end']
      },
      {
        title: "Reward",
        data: "reward",
        orderable: false,
        render: function (data) {
          if (data == "") return "-";
          let full = master[data];
          return `[${full.id}] ${full.name}`;
        }
      },
      {
        title: "Requirement",
        data: "requirement",
        orderable: false,
        render: function (data) {
          if (data == "") return "-";
          let full = master[data];
          return `[${full.id}] ${full.name}`;
        }
      },
      {
        title: "%",
        data: "odd",
        orderable: false,
        render: function (data) {
          if (totalOdd === 0) return 0;
          return Number(data / totalOdd * 100).toLocaleString("en", {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5
          });
        }
      },
      {
        title: "#",
        data: null,
        orderable: false,
        width: 100,
        class: ['text-center'],
        render: function (data, type, row) {
          let btn = $("<button>");
          btn.attr('type', "button");
          btn.attr('class', "btn btn-danger btn-sm btn-delete w-100");
          btn.html("Delete");
          return btn.prop('outerHTML');
        }
      },
    ]
  });

  eTable.on('click', '.btn-delete', function () {
    let row = $(this).closest('tr');
    db.row(row).remove();

    let old = db.data().toArray();
    db.clear();
    db.rows.add(old);
    db.draw();
  });

  $(".btn-add").on('click', function () {
    let odd = Number(eOdd.val());
    if (isNaN(odd) || odd === 0) {
      alert("Odd is required");
      return;
    }

    totalOdd += odd;
    let old = db.data().toArray();
    old.push({
      odd,
      reward: eReward.val(),
      requirement: eReq.val(),
    });

    db.clear();
    db.rows.add(old);
    db.draw();
  });

  $(".btn-load").on('click', function () {
    eFile.click();
  });

  eFile.on('change', function (e) {
    let files = e.target.files;
    if (files.length === 0) {
      alert("Please select file");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', (ev) => {
      let loaded = JSON.parse(ev.target.result);
      eName.val(loaded.name);

      totalOdd = 0;
      let formatted = [];
      for (let x of loaded.odds) {
        totalOdd += x[0];
        formatted.push({
          odd: x[0],
          reward: x[1] || "",
          requirement: x[2] || ""
        })
      }

      db.clear();
      db.rows.add(formatted);
      db.draw();
    });
    reader.readAsText(files[0], 'utf-9');
  });

  $(".btn-save").on("click", function () {
    let fullData = db.data().toArray();
    if (fullData.length === 0) {
      alert("Please input at least one odd");
      return;
    }

    let fullFormat = {
      name: eName.val().trim(),
      odds: []
    }

    if (fullFormat.name == "") {
      alert("Name is required");
      return;
    }

    for (let x of fullData) {
      let reward = x.reward;
      if (reward == "") reward = null;
      let xData = [x.odd, reward];
      if (x.requirement !== "") xData.push(x.requirement);
      fullFormat.odds.push(xData)
    }

    fullFormat.odds.sort((a, b) => a[0] - b[0]);
    let strContent = JSON.stringify(fullFormat, null, 2);
    strContent = strContent.replace(/(\[|,)\n\s{6}/ig, "$1");
    strContent = strContent.replace(/"\n\s{4}/ig, `"`);
    const link = document.createElement("a");
    const file = new Blob([strContent], { type: 'application/json' });
    link.href = URL.createObjectURL(file);
    let fn = fullFormat.name.toLowerCase().replace(/[^a-z0-9\s]+/ig, "").replace(/\s+/ig, "_");
    link.download = fn + ".funman";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  function loadDatabase() {
    let funman_templates = localStorage.getItem("funman_master_db");
    let last_update = localStorage.getItem("funman_master_db_last_update");
    if (!funman_templates) {
      $(".form-select").select2({
        width: '100%',
        data: [],
        allowClear: true,
        placeholder: "Select asset",
        minimumInputLength: 1
      });
      $("#aa_last_update").val("Never");
      $("#aa_total_data").val("0");
      return;
    }

    master = JSON.parse(funman_templates);
    $("#aa_last_update").val(last_update);
    $("#aa_total_data").val(Object.keys(master).length.toLocaleString("en"));
    
    let select = [{id: "", text: ""}];
    for (let x of Object.entries(master)) {
      select.push({id: x[0], text: `[${x[1].id}] ${x[1].name}`})
    }

    $(".form-select").select2({
      width: '100%',
      data: select,
      allowClear: true,
      placeholder: "Select asset",
      minimumInputLength: 1
    });
  }

  let btnUpdate = $("#update_db");
  function fetchAndUpdateDatabase(page) {
    btnUpdate.prop("disabled", true);
    btnUpdate.html("Updating...");
    let endpoint = $("#aa_endpoint").val();
    let parameter = "?collection_name=funmangalaxy&limit=1000";
    let urlEndpoint = (page) => `${endpoint}/atomicassets/v1/templates${parameter}&page=${page}&order=asc`;
    if (page == 1) localStorage.removeItem("funman_master_db");

    $.ajax({
      url: urlEndpoint(page),
      success: function (r) {
        let names = {};
        for (let tmpl of r.data) {
          let t_name = tmpl['immutable_data']['name'].trim();
          let k_name = t_name.toLowerCase().replace(/[^\w\s]+/gi, '').replace(/\s+/gi, "_");
          names[k_name] = {
            id: tmpl['template_id'],
            schema: tmpl['schema']['schema_name'],
            name: t_name
          }
        }

        let existing = localStorage.getItem("funman_master_db");
        if (existing) {
          let existingData = JSON.parse(existing);
          names = {...existingData, ...names};
          names['dust_dust_wand'] = {
            id: "569552",
            schema: '',
            name: "[DUST] Dust Wand"
          };
        }
        localStorage.setItem("funman_master_db", JSON.stringify(names));
        localStorage.setItem("funman_master_db_last_update", (new Date()).toISOString());
        
        if (r.data.length === 1000) {
          btnUpdate.prop("disabled", true);
          btnUpdate.html(`Updating... (Page ${page + 1})`);
          fetchAndUpdateDatabase(page + 1);
        } else {
          loadDatabase();
          btnUpdate.prop("disabled", false);
          btnUpdate.html("Update Database");
          alert("Database update completed");
        }
      },
      error: function () {
        btnUpdate.prop("disabled", false);
        btnUpdate.html("Update Database");
        alert("Failed to update database, please try again later.");
      }
    })
  }

  btnUpdate.on("click", function () {
    fetchAndUpdateDatabase(1);
  });

  loadDatabase();
});
